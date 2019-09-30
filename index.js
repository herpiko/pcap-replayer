const async = require("async");
const axios = require("axios");
const readline = require("readline");
const path = require("path");
const fs = require("fs");
const directoryPath = path.join(__dirname, process.argv[2]);
const https = require("https");

const supportedMethods = ["POST", "GET", "PUT", "DELETE"];
const baseURL = "https://localhost";
const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const replay = requests => {
  let count = 0;
  async.eachSeries(
    requests,
    (req, cb) => {
      let msg = count + ". " + req.method.toUpperCase() + " " + req.url;
      count++;
      // Ignore ws
      if (req.url.startsWith(baseURL + "/ws?")) {
        cb();
        return;
      }
      // Ignore gerbang-organization
      if (req.url.endsWith("gerbang-organizations")) {
        cb();
        return;
      }
      try {
        instance(req)
          .then(res => {
            console.log(msg + " OK");
          })
          .catch(err => {
            if (err.response && err.response.status) {
              console.log(msg + " NOT-OK " + err.response.status);
            } else {
              console.log(msg + " NOT-OK ");
              console.log(err);
            }
          })
          .finally(() => {
            cb();
          });
      } catch (err) {
        console.log(err);
      }
    },
    err => {
      console.log("Replay done");
    }
  );
};

fs.readdir(directoryPath, function(err, files) {
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }
  let requests = [];
  async.eachSeries(
    files,
    (file, cb) => {
      if (!file.endsWith(".dat")) {
        cb();
        return;
      }
      let req = { url: baseURL, headers: {} };
      let rl = readline.createInterface({
        input: fs.createReadStream(file)
      });

      let line_no = 0;

      rl.on("line", function(line) {
        if (line_no === 0 && line.split(" /")[1]) {
          req.method = line.split(" ")[0].toLowerCase();
          req.url += line.split(" ")[1];
        } else if (line_no > 0) {
          // In case the new request is not on new line,
          // e.g. 
          /*
            {""state":"DONE"}GET /api/v1/foo/bar HTTP/1.1
          */
          let splitted = [];
          for (let i in supportedMethods) {
            if (line.indexOf(supportedMethods[i] + " /") > -1) {
              splitted = line.split(supportedMethods[i] + " /");
              break;
            }
          }
          if (splitted.length > 1) {
            let nextLine = false;
            let payload;
            if (splitted[0].startsWith("{")) {
							// Retry on all supported methods
              try {
                payload = JSON.parse(line.split("}GET ")[0] + "}");
                nextLine = "GET " + line.split("}GET")[1];
              } catch (e) {
                try {
                  payload = JSON.parse(line.split("}POST ")[0] + "}");
                  nextLine = "DELETE " + line.split("}POST")[1];
                } catch (e) {
                  try {
                    payload = JSON.parse(line.split("}PUT ")[0] + "}");
                    nextLine = "PUT " + line.split("}PUT")[1];
                  } catch (e) {
                    try {
                      payload = JSON.parse(line.split("}DELETE ")[0] + "}");
                      nextLine = "DELETE " + line.split("}DELETE")[1];
                    } catch (e) {}
                  }
                }
              }
            }
            if (payload) {
              req.data = payload;
            } else if (line.split(": ").length === 2) {
              req.headers[line.split(": ")[0]] = line.split(": ")[1];
            }
            if (Object.keys(req.headers).length > 0) {
              requests.push(req);
            }

            // Continue as new request
            req = { url: baseURL, headers: {} };
            if (splitted[0].startsWith("{")) {
              req.method = nextLine.split(" ")[0].toLowerCase();
              req.url += nextLine.split(" ")[1];
            } else if (line.split(" /")[1]) {
              req.method = line.split(" ")[0].toLowerCase();
              req.url += line.split(" ")[1];
            }
          }

          let payload;
          try {
            payload = JSON.parse(line);
          } catch (e) {}
          if (payload) {
            req.data = payload;
          } else if (line.split(": ").length === 2) {
            req.headers[line.split(": ")[0]] = line.split(": ")[1];
          }
        }
        line_no++;
      });

      rl.on("close", function(line) {
        if (Object.keys(req.headers).length < 1) {
          cb();
          return;
        }
        requests.push(req);
        cb();
      });
    },
    err => {
      if (request.length < 1) {
        console.log('No request available.');
        process.exit(1);
      }
      replay(requests);
    }
  );
});
