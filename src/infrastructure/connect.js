const mongoose = require("mongoose");
const dns = require("dns");
const { srvToDirectConnectionString } = require("./atlasDirectUri");

/** Prefer IPv4 for DNS results (helps some Windows / corporate networks). */
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const connectOptions = {
  serverSelectionTimeoutMS: 25_000,
  socketTimeoutMS: 45_000,
  family: 4,
};

/**
 * Single Atlas connection. Scraping secondary DB removed.
 * If MONGODB_URI is mongodb+srv and local querySrv fails, we resolve SRV via HTTPS DNS and use mongodb:// seeds.
 */
const connect = async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri || !String(uri).trim()) {
    throw new Error(
      "MONGODB_URI is missing. Set it in .env (e.g. mongodb+srv://.../ElectronDB?...).",
    );
  }
  uri = String(uri).trim();

  let uriLabel = uri.startsWith("mongodb+srv://") ? "mongodb+srv (will try direct seeds if needed)" : "mongodb";

  if (process.env.MONGODB_DIRECT_URI && String(process.env.MONGODB_DIRECT_URI).trim()) {
    uri = String(process.env.MONGODB_DIRECT_URI).trim();
    uriLabel = "MONGODB_DIRECT_URI";
    console.log("[MongoDB] Using MONGODB_DIRECT_URI from .env");
  } else if (/^mongodb\+srv:\/\//i.test(uri)) {
    try {
      const direct = await srvToDirectConnectionString(uri);
      uri = direct;
      uriLabel = "mongodb (SRV via HTTPS DNS → seed list)";
      console.log("[MongoDB]", uriLabel);
    } catch (e) {
      console.warn(
        "[MongoDB] Could not build direct URI from SRV (DoH):",
        e.message || e,
      );
      console.warn("[MongoDB] Falling back to original mongodb+srv (needs working system DNS).");
    }
  }

  try {
    await mongoose.connect(uri, connectOptions);
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes("querySrv") || msg.includes("ENOTFOUND")) {
      console.error(
        "\n[MongoDB] لا يزال فشل DNS. أضف في .env سلسلة Atlas العادية (mongodb:// بدون +srv) من Atlas → Connect → Drivers، في المتغير:\n" +
          "  MONGODB_DIRECT_URI=mongodb://...\n",
      );
    }
    throw err;
  }

  const dbName = mongoose.connection?.db?.databaseName;
  console.log(
    "Connected to MongoDB",
    uriLabel,
    dbName ? `(database: ${dbName})` : "",
  );
};

module.exports = { connect, mongoose };
