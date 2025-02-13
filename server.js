// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");


// Initialize the app
// Initialize the app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const dbURI = "mongodb+srv://Akshaya:Akshaya9876@vishwasri.s7v4g.mongodb.net/Jwellery-mobile-app?retryWrites=true&w=majority&appName=Vishwasri"; // Replace with your MongoDB URI
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.log("MongoDB connection error:", error));

// Define the User schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  emailOrMobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Create the User model
const User = mongoose.model("User", userSchema);

// Routes

// User registration
app.post("/SignUp", async (req, res) => {
  const { fullName, emailOrMobile, password } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ emailOrMobile });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const newUser = new User({
    fullName,
    emailOrMobile,
    password: hashedPassword,
  });

  try {
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
});

// User login
app.post("/SignIn", async (req, res) => {
  const { emailOrMobile, password } = req.body;

  // Find the user by email or mobile
  const user = await User.findOne({ emailOrMobile });
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  // Generate a JWT token
  const token = jwt.sign({ id: user._id }, "vishwasri-secret-key", { expiresIn: "1h" });

  res.status(200).json({ message: "Login successful", token });
});

// Middleware to Verify JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Access denied, no token provided" });

  // Ensure token starts with "Bearer"
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });
  
    jwt.verify(token, "vishwasri-secret-key", (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    });
  };
  
  // ✅ *Update Password Endpoint with Previous Password Check*
app.post("/Forgot", authenticateToken, async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // Fetch the user from the database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare new password with the existing hashed password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from the previous password" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating password", error });
  }
});


// Define Profile Schema
const ProfileSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  emailOrmobile: { type: String, required: true, unique: true },
});

const Profile = mongoose.model("Profile", ProfileSchema);

// API to Save Profile Details
app.post("/Editprofile", async (req, res) => {
  try {
    const { firstName, lastName, emailOrmobile } = req.body;

    // ✅ Ensure emailOrmobile exists before using .match()
    if (!emailOrmobile) {
      return res.status(400).json({ error: "Email or mobile number is required." });
    }

    // ✅ Email and Mobile Number Validation
    const mobileRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!mobileRegex.test(emailOrmobile) && !emailRegex.test(emailOrmobile)) {
      return res.status(400).json({ error: "Enter a valid email or 10-digit mobile number." });
    }

    // ✅ Save Profile to Database
    const profile = new Profile({ firstName, lastName, emailOrmobile });
    await profile.save();

    res.json({ message: "Profile saved successfully", profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ error: error.message });
  }
});

  // API to Get Profile
  app.get("/Profile", async (req, res) => {
    try {
      const profiles = await Profile.find(); // Get all profiles
      if (profiles.length === 0) return res.status(404).json({ message: "No profiles found" });
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  // Address Schema & Model (Embedded Here)
const AddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  pincode: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  locality: { type: String, required: true },
  houseNo: { type: String, required: true },
  addressType: { type: String, enum: ["Home", "Office", "Other"], required: true },
  createdAt: { type: Date, default: Date.now },
});

const Address = mongoose.model("Address", AddressSchema);

// API Routes

// Save Address
app.post("/Addaddress", async (req, res) => {
  try {
    const newAddress = new Address(req.body);
    await newAddress.save();
    res.status(201).json({ message: "✅ Address saved successfully!", address: newAddress });
  } catch (err) {
    res.status(500).json({ error: "❌ Error saving address", details: err.message });
  }
});

// Fetch All Addresses
app.get("/ProfileAddress", async (req, res) => {
  try {
    const addresses = await Address.find();
    res.status(200).json(addresses);
  } catch (err) {
    res.status(500).json({ error: "❌ Error fetching addresses", details: err.message });
  }
});

app.delete("/ProfileAddress/:id", async (req, res) => {
  try {
    const addressId = req.params.id;
    const deletedAddress = await Address.findByIdAndDelete(addressId);
    
    if (!deletedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }
    
    res.status(200).json({ message: "✅ Address deleted successfully!", address: deletedAddress });
  } catch (err) {
    res.status(500).json({ error: "❌ Error deleting address", details: err.message });
  }
});


app.put("/EditAddress/:id", async (req, res) => {
  try {
    const updatedData = req.body;
    const addressId = req.params.id;

    const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

    if (!updatedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json({ message: "✅ Address updated successfully!", address: updatedAddress });
  } catch (err) {
    res.status(500).json({ error: "❌ Error updating address", details: err.message });
  }
});


app.get("/Notify", async (req, res) => {
  try {
    // Assuming we fetch the most recent profile (Modify as needed)
    const profile = await Profile.findOne().sort({ _id: -1 });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});