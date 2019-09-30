# PCAP Replayer

## Usage

So we want to investigate our container behaviours against real incoming requests.

Prepare the `tcpdump` image,

```
docker build -t tcpdump - <<EOF
FROM ubuntu
RUN apt-get update && apt-get install -y tcpdump
CMD tcpdump -i eth0
EOF

```

Tap it,

`docker run -ti -v $(pwd)/.:/tmp --net=container:backend tcpdump tcpdump -v -A -s0 -i eth0 dst port 8000 and inbound -w /tmp/dump`

Once you think it's enough, stop it then convert the dump file to parseable files with `tcptrace -e dump`.

Finally, replay them all,

`node index.js /path/to/dat/files/`

You may need to change the `baseURL` value to your dev/staging hostname.

Supported methods: `GET`, `POST`, `PUT`, `DELETE`

## License

MIT
