const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../Models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/nftplatform";
const DEFAULT_OWNER_ID = "65d6242a8fe7d5716561e167"; // Replace with actual user ID

main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  
  // Ensure all listings have an owner
  const listingsWithOwner = initData.data.map((obj) => ({
    ...obj,
    owner: DEFAULT_OWNER_ID, // Assign default owner ID
  }));

  await Listing.insertMany(listingsWithOwner);
  console.log("Data was initialized with owners.");
};

initDB();
