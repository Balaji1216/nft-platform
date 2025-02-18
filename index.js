require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./Models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const multer = require("multer");
const fs = require("fs");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./Models/user.js");
const userRouter = require("./routes/user.js");
const { PythonShell } = require("python-shell");

async function main() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/nftplatform");
        console.log("Connection successful to DB");
    } catch (err) {
        console.error("Connection failed", err);
    }
}
main();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.successMessage = req.flash("success");
    res.locals.errorMessage = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, "public/uploads");
        try {
            await fs.promises.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You must be logged in to perform this action.");
    res.redirect("/login");
}

async function isOwner(req, res, next) {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }
        if (!listing.owner || !req.user || !listing.owner.equals(req.user._id)) {
            req.flash("error", "You don't have permission to modify this listing.");
            return res.redirect(`/listings/${req.params.id}`);
        }
        next();
    } catch (error) {
        req.flash("error", "Error checking ownership.");
        res.redirect("/listings");
    }
}

app.use("/", userRouter);

app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new");
});

app.post("/listings", isLoggedIn, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            req.flash("error", "Please upload an image.");
            return res.redirect("/listings/new");
        }
        const newListing = new Listing({
            ...req.body.listing,
            image: "/uploads/" + req.file.filename,
            owner: req.user._id
        });
        await newListing.save();
        req.flash("success", "Art created successfully!");
        res.redirect("/listings");
    } catch (err) {
        req.flash("error", "Error creating listing.");
        res.redirect("/listings/new");
    }
});

app.get("/listings", async (req, res) => {
    try {
        const searchQuery = req.query.search || "";
        const allListings = await Listing.find({
            title: { $regex: searchQuery, $options: "i" }
        }).populate("owner");

        res.render("listings/index", { allListings, searchQuery });
    } catch (error) {
        req.flash("error", "Error fetching listings.");
        res.redirect("/");
    }
});

app.get("/listings/:id", async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id).populate("owner");
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }
        res.render("listings/show", { listing });
    } catch (error) {
        req.flash("error", "Error fetching listing details.");
        res.redirect("/listings");
    }
});

app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }
        res.render("listings/edit", { listing });
    } catch (error) {
        req.flash("error", "Error loading edit page.");
        res.redirect("/listings");
    }
});

// app.get("/generate-description", async (req, res) => {
//   const prompt = req.query.prompt || "A futuristic NFT artwork";
//   console.log("Received prompt:", prompt);

//   let options = {
//       mode: "text",
//       pythonPath: process.env.PYTHON_PATH || "python",
//       scriptPath: path.join(__dirname, "ai"),
//       args: [prompt]
//   };

//   PythonShell.run("generative_ai.py", options, function (err, results) {
//       if (err) {
//           console.error("PythonShell Error:", err);
//           return res.json({ error: "AI generation failed" });
//       }
//       console.log("PythonShell Output:", results);
//       res.json({ description: results[0] });
//   });
// });
// const { spawn } = require("child_process");


// // Update the path to include the "ai" folder
// const pythonScriptPath = path.join(__dirname, "ai", "generative_ai.py");

// function generateNFTDescription(prompt) {
//     return new Promise((resolve, reject) => {
//         const pythonProcess = spawn("python", [pythonScriptPath, prompt]);

//         let output = "";
//         pythonProcess.stdout.on("data", (data) => {
//             output += data.toString();
//         });

//         pythonProcess.stderr.on("data", (data) => {
//             console.error(`Error: ${data}`);
//         });

//         pythonProcess.on("close", (code) => {
//             if (code === 0) {
//                 resolve(output.trim());
//             } else {
//                 reject(`Python script exited with code ${code}`);
//             }
//         });
//     });
// }

// // Example usage
// generateNFTDescription("Create an NFT description")
//     .then((description) => {
//         console.log("Generated NFT Description:", description);
//     })
//     .catch((error) => {
//         console.error("Error:", error);
//     });
const dalleModule = require("./ai/generative_ai");

if (!dalleModule || !dalleModule.dalle || typeof dalleModule.dalle.generateImage !== "function") {
    console.error("Error: dalle.generateImage is not defined. Check your generative_ai module.");
}

app.get("/generate-nft", isLoggedIn, async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    if (!dalleModule || !dalleModule.dalle || typeof dalleModule.dalle.generateImage !== "function") {
        return res.status(500).json({ error: "Image generation service is unavailable." });
    }

    try {
        const imageUrl = await dalleModule.dalle.generateImage(prompt);
        res.json({ imageUrl });
    } catch (err) {
        console.error("Image Generation Error:", err);
        res.status(500).json({ error: "Failed to generate image" });
    }
});


app.put("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    try {
        await Listing.findByIdAndUpdate(req.params.id, { ...req.body.listing });
        req.flash("success", "Listing updated successfully!");
        res.redirect(`/listings/${req.params.id}`);
    } catch (error) {
        req.flash("error", "Error updating listing.");
        res.redirect(`/listings/${req.params.id}/edit`);
    }
});

app.delete("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    try {
        await Listing.findByIdAndDelete(req.params.id);
        req.flash("success", "Listing deleted successfully!");
        res.redirect("/listings");
    } catch (error) {
        req.flash("error", "Error deleting listing.");
        res.redirect("/listings");
    }
});

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});
