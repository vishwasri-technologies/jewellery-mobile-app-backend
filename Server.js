

// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

// Initialize the app
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());  // ✅ Ensure JSON is parsed properly
app.use(express.urlencoded({ extended: true })); // ✅ Optional for form data


// MongoDB connection
const dbURI = "mongodb+srv://vishwasritechnologies:chandu%402003@vishwasri01.7wesl.mongodb.net/Jwellery-mobile-app?retryWrites=true&w=majority&appName=Vishwasri01"; // Replace with your MongoDB URI
mongoose.connect(dbURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.log("MongoDB connection error:", error));

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
    const token = jwt.sign({ id: newUser._id }, "vishwasri-secret-key", {
      expiresIn: "30d"
    }); // Added expiry time
    res.status(201).json({ message: "User registered successfully", token });
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
  const token = jwt.sign({ id: user._id }, "vishwasri-secret-key", { expiresIn: "30d" });

  res.status(200).json({ message: "Login successful", token });
});


  
  // ✅ **Update Password Endpoint with Previous Password Check**
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  emailOrmobile: { type: String, required: true, unique: true },
});

const Profile = mongoose.model("Profile", ProfileSchema);

// API to Save Profile Details
app.post("/Editprofile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, emailOrmobile } = req.body;

    if (!emailOrmobile) {
      return res.status(400).json({ error: "Email or mobile number is required." });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!mobileRegex.test(emailOrmobile) && !emailRegex.test(emailOrmobile)) {
      return res.status(400).json({ error: "Enter a valid email or 10-digit mobile number." });
    }

    // ✅ Instead of creating a new profile, update the existing one
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id }, // Find by userId
      { firstName, lastName, emailOrmobile }, // Update fields
      { new: true, upsert: true } // Return updated document, create if not exists
    );

    res.json({ message: "Profile saved successfully", profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ error: error.message });
  }
});


  app.get("/Profile", authenticateToken, async (req, res) => {
    try {
      const profile = await Profile.findOne({ userId: req.user.id }); // Get the user profile
  
      if (!profile) {
        return res.status(200).json({ message: "No profile found", profile: null }); // Send null instead of 404
      }
  
      res.json(profile); // Send the profile directly
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  


  // Address Schema & Model (Embedded Here)
const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Link to user
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
app.post("/Addaddress", authenticateToken, async (req, res) => {
  try {
    const newAddress = new Address({ ...req.body, userId: req.user.id });
    await newAddress.save();
    res.status(201).json({ message: "✅ Address saved successfully!", address: newAddress });
  } catch (err) {
    res.status(500).json({ error: "❌ Error saving address", details: err.message });
  }
});

// Fetch All Addresses
app.get("/ProfileAddress", authenticateToken, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id });
    res.status(200).json(addresses);
  } catch (err) {
    res.status(500).json({ error: "❌ Error fetching addresses", details: err.message });
  }
});

app.delete("/ProfileAddress/:id", authenticateToken, async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id; // Get user ID from JWT

    // ✅ Check if address belongs to the logged-in user
    const deletedAddress = await Address.findOneAndDelete({ _id: addressId, userId });

    if (!deletedAddress) {
      return res.status(404).json({ error: "❌ Address not found or unauthorized" });
    }

    res.status(200).json({ message: "✅ Address deleted successfully!", address: deletedAddress });
  } catch (err) {
    console.error("❌ Error deleting address:", err);
    res.status(500).json({ error: "❌ Internal Server Error", details: err.message });
  }
});



app.put("/EditAddress/:id", authenticateToken, async (req, res) => {
  try {
    const updatedData = req.body;
    const addressId = req.params.id;

    // Verify the user owns the address
    const address = await Address.findOne({ _id: addressId, userId: req.user.id });

    if (!address) {
      return res.status(404).json({ error: "❌ Address not found or unauthorized" });
    }

    const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

    if (!updatedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json({ message: "✅ Address updated successfully!", address: updatedAddress });
  } catch (err) {
    res.status(500).json({ error: "❌ Error updating address", details: err.message });
  }
});


app.get("/Notify",authenticateToken, async (req, res) => {
  try {
    // Assuming we fetch the most recent profile (Modify as needed)
    const profile = await Profile.findOne({ userId: req.user.id }).sort({ _id: -1 });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: error.message });
  }
});




// Define Order Schema
const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔹 Link to user
  items: [
    {
      id: String,
      name: String,
      price: Number,
      qty: Number,
      image: String,
    },
  ],
  itemsPrice: Number, // Total price of items before taxes & delivery
  deliveryCharge: Number,
  sgst: Number,
  cgst: Number,
  subTotal: Number, // Total before payment
  totalAmount: Number, // Final amount payable
  deliveryAddress: String,
  status: { type: String, default: "pending" },
  paymentId: String,
  orderId: String,
  method: String,
  createdAt: { type: Date, default: Date.now },
  cancellation: {
    reason: String,
    canceledAt: Date,
  },
});
const Order = mongoose.model("Order", OrderSchema);

app.post("/Cart",  authenticateToken, async (req, res) => {
  try {

    console.log("📥 Received order request:", req.body);
    
    const { items, deliveryAddress, method } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error(" Cart is empty or not an array:", items);
      return res.status(400).json({ error: "Cart cannot be empty" });
    }

    if (!deliveryAddress) {
      console.error(" Delivery address missing!");
      return res.status(400).json({ error: "Delivery address is required" });
    }

    // Calculate amounts
    const itemsPrice = items.reduce((total, item) => total + item.price * item.qty, 0);
    const deliveryCharge = items.length > 0 ? 50 : 0;
    const sgst = (itemsPrice * 2.5) / 100;
    const cgst = (itemsPrice * 2.5) / 100;
    const subTotal = itemsPrice + deliveryCharge + sgst + cgst;
    const totalAmount = subTotal;


    // ✅ Store order in MongoDB first
    const newOrder = new Order({
      userId: req.user.id, 
      items,
      itemsPrice,
      deliveryCharge,
      sgst,
      cgst,
      subTotal,
      totalAmount,
      deliveryAddress,
      status: "pending",
    });

    await newOrder.save();
    console.log("✅ Order stored successfully:", newOrder);


    // ✅ Return full order data including `_id`
    res.status(201).json({
      message: "Order stored successfully",
      order: newOrder, // Include full MongoDB order data
    });

  } catch (error) {
    console.error(" Error storing order:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});




app.get("/get-order/:orderId", authenticateToken, async (req, res) => {
  try {
    console.log("📥 Fetching order details:", req.params.orderId);
    
    const userId = req.user.id;
    const orderId = req.params.orderId;

    // ❌ FIX: `findById` does not support userId filtering
    // ✅ Use `findOne` to check both `_id` and `userId`
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      console.error("❌ Order not found in database!");
      return res.status(404).json({ error: "Order not found!" });
    }

    console.log("✅ Order found:", order);

    res.json({ order });

  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({ error: "Failed to retrieve order", details: error.message });
  }
});




// Route for Cash on Delivery (COD)
app.post("/cod-order", authenticateToken, async (req, res) => {
  try {
    const { items, totalAmount, deliveryAddress } = req.body;

    // ✅ Calculate amounts like in UPI order
    const itemsPrice = items.reduce((total, item) => total + item.price * item.qty, 0);
    const deliveryCharge = items.length > 0 ? 50 : 0;
    const sgst = (itemsPrice * 2.5) / 100;
    const cgst = (itemsPrice * 2.5) / 100;
    const subTotal = itemsPrice + deliveryCharge + sgst + cgst;

    // ✅ Ensure COD order stores the same details as UPI orders
    const newOrder = new Order({
      userId: req.user.id,
      items,
      itemsPrice,  
      deliveryCharge,   
      sgst,          
      cgst,            
      subTotal,        
      totalAmount,
      deliveryAddress,
      status: "cod_pending",
      method: "Cash On Delivery",
    });

    await newOrder.save();
    console.log("✅ COD Order stored successfully:", newOrder);

    res.json({ success: true, message: "COD order placed successfully", order: newOrder });
  } catch (error) {
    console.error("❌ Error placing COD order:", error);
    res.status(500).json({ error: "Error placing COD order" });
  }
});


app.get("/last-order", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lastOrder = await Order.findOne({ userId }).sort({ createdAt: -1 }); // Fetch the latest order

    if (!lastOrder) {
      return res.status(404).json({ error: "No orders found" });
    }

    res.json({ 
      success: true, 
      order: {
        _id: lastOrder._id,
        items: lastOrder.items,
        itemsPrice: lastOrder.itemsPrice,
        sgst: lastOrder.sgst,
        cgst: lastOrder.cgst,
        subTotal: lastOrder.subTotal,
        deliveryCharge: lastOrder.deliveryCharge,
        totalAmount: lastOrder.totalAmount,
        deliveryAddress: lastOrder.deliveryAddress,
        status: lastOrder.status,
        paymentId: lastOrder.paymentId,
        orderId: lastOrder.orderId,
        method: lastOrder.method,
        createdAt: lastOrder.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve order", details: error.message });
  }
});


// ✅ API to Cancel the Last Ordered Product
app.post("/cancel-last-order", authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;

    // Fetch the last ordered product
    const lastOrder = await Order.findOne({ userId: req.user.id }).sort({ createdAt: -1 });

    if (!lastOrder) {
      return res.status(404).json({ error: "No orders found" });
    }

    // ✅ Mark the order as canceled
    lastOrder.status = "canceled";
    lastOrder.cancellation = { reason, canceledAt: new Date() };
    await lastOrder.save();

    res.json({
      success: true,
      message: "Order has been canceled successfully",
      order: {
        id: lastOrder._id,
        status: lastOrder.status,
        cancellation: lastOrder.cancellation,
        items: lastOrder.items, // ✅ Include canceled products
      },
    });
  } catch (error) {
    console.error("❌ Error canceling order:", error);
    res.status(500).json({ error: "Error canceling order" });
  }
});

// ✅ API to Get Canceled Orders with Quantity
app.get("/canceled-orders", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const canceledOrders = await Order.find({ userId, status: "canceled" });

    if (!canceledOrders || canceledOrders.length === 0) {
      return res.json({ success: true, orders: [] }); // ✅ Return empty array instead of 404
    }

    // ✅ Ensure that each item includes quantity
    const formattedOrders = canceledOrders.map(order => ({
      id: order._id,
      status: order.status,
      cancellation: order.cancellation,
      items: order.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,  // ✅ Include the quantity of each item
        image: item.image,
      }))
    }));

    res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error("❌ Error fetching canceled orders:", error);
    res.status(500).json({ error: "Error fetching canceled orders" });
  }
});


// Delete User Account
app.delete("/DeleteAccount", authenticateToken, async (req, res) => {
  try {
    // Extract user ID from JWT token
    const userId = req.user.id;

    // Find and delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

     // Delete user's profile
     await Profile.deleteOne({ userId });

     // Delete user's addresses
     await Address.deleteMany({ userId });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting account", error });
  }
});





// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
