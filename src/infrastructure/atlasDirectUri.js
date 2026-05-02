/**
 * When system DNS cannot resolve mongodb+srv (querySrv ECONNREFUSED), resolve SRV via
 * DNS-over-HTTPS (Cloudflare) and build a standard mongodb:// seed list URI.
 */

const https = require("https");

function dohQuery(name, type) {
  return new Promise((resolve, reject) => {
    const url = `https://1.1.1.1/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
    https
      .get(url, { headers: { accept: "application/dns-json" } }, (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function parseSrvHosts(dnsJson) {
  if (!dnsJson || dnsJson.Status !== 0 || !Array.isArray(dnsJson.Answer)) {
    return [];
  }
  const hosts = [];
  for (const a of dnsJson.Answer) {
    if (a.type !== 33) continue;
    const parts = String(a.data || "").trim().split(/\s+/);
    if (parts.length < 4) continue;
    const port = parts[2];
    const target = parts[3].replace(/\.$/, "");
    if (target && port) hosts.push(`${target}:${port}`);
  }
  return hosts;
}

/**
 * @param {string} srvUri mongodb+srv://...
 * @returns {Promise<string>} mongodb://host1:27017,host2:27017/...
 */
async function srvToDirectConnectionString(srvUri) {
  const trimmed = String(srvUri || "").trim();
  if (!/^mongodb\+srv:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const forUrl = trimmed.replace(/^mongodb\+srv:\/\//i, "mongodb://");
  let url;
  try {
    url = new URL(forUrl);
  } catch (e) {
    throw new Error(`Invalid MONGODB_URI: ${e.message}`);
  }

  const srvName = `_mongodb._tcp.${url.hostname}`;
  const dnsJson = await dohQuery(srvName, "SRV");
  const hosts = parseSrvHosts(dnsJson);
  if (hosts.length === 0) {
    throw new Error(`No SRV answers for ${srvName} (DoH)`);
  }

  const user = url.username ? decodeURIComponent(url.username) : "";
  const pass = url.password ? decodeURIComponent(url.password) : "";
  const auth =
    user !== ""
      ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`
      : "";

  let dbPath = url.pathname || "";
  if (dbPath === "/") dbPath = "";

  const qs = new URLSearchParams(url.search);
  qs.set("tls", "true");
  if (!qs.has("authSource")) {
    qs.set("authSource", "admin");
  }

  const query = qs.toString();
  const hostList = hosts.join(",");
  return `mongodb://${auth}${hostList}${dbPath}${query ? `?${query}` : ""}`;
}

module.exports = { srvToDirectConnectionString };
