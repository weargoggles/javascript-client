import * as Url from "url";
import * as http from "http";
import { selectCodec } from "./codecs";

const method_map = {
    'follow': 'GET',
    'action': 'POST',
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'get': 'GET',
    'post': 'POST',
    'put': 'PUT',
    'patch': 'PATCH'
};

class HTTPTransport {
    constructor() {
    }
    getHostname (url) {
        let url_components = Url.parse(url);
        return url_components.hostname;
    }
    getPort (url) {
        let url_components = Url.parse(url);
        return url_components.port;
    }
    getPath (method, url, parameters) {
        let url_components = Url.parse(url),
            path = url_components.path;
        if (parameters && method === 'GET') {
            let paramArray = Object.keys(parameters).map(key => `${key}=${parameters[key]}`);
            let paramString = paramArray.reduce((acc, x) => `${acc}&${x}`);
            return `${path}?${paramString}`;
        }
        return path;
    }
    transition (url, t, parameters=false) {
        const method = method_map[t];
        let p = new Promise((resolve, reject) => {
            let hostname = this.getHostname(url);
            let port = this.getPort(url);
            let path = this.getPath(method, url);
            console.log(hostname, port, path);
            let data = null;
            let outgoing = null;
            var headers = {
                'Accept': 'application/vnd.coreapi+json, application/json'
            };
            if (parameters && method !== 'GET') {
                headers['Content-type'] = 'application/json';
                outgoing = JSON.stringify(parameters);
                headers['Content-length'] = outgoing.length;
                console.log(outgoing, headers);
            }
            let request = http.request(
                {
                    method: method,
                    hostname: hostname,
                    port: port,
                    path: path,
                    headers: headers
                },
                response => {
                    let content_type = response.headers["content-type"];
                    let codec = selectCodec(content_type);
                    let data = '';
                    response.on('data', chunk => { data += chunk; });
                    response.on('end', _ => {
                        if (t !== 'delete') {
                            let loaded = codec.load(data, url);
                            resolve(loaded);
                        }
                        resolve(null);
                    });
                }
            );

            request.on('error', reject);

            if (parameters && method !== 'GET') {
                request.write(outgoing);
            }

            request.end();
        });
        return p;
    }
}

function getTransport(protocol) {
    return new HTTPTransport();
}

export function transition(url, t, parameters) {
    let url_components = Url.parse(url);

    let protocol = url_components.protocol;
    let hostname = url_components.hostname;

    let transport = getTransport(protocol);

    return transport.transition(url, t, parameters);
}
