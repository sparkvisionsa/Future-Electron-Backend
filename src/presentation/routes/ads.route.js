const express = require("express");
const { getAllAds } = require("../controllers/ads.controller");

const router = express.Router();

router.get("/all", getAllAds);

module.exports = router;
