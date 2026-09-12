const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { exists } = require("../models/User");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");


const router = express.Router();

router.post("/register", async (req, res) => {
    try{
        const{ name , email, password}=req.body;

        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password,10);
        
        const newUser = await User.create({
            name, email, password : hashedPassword
        });

        res.status(400).json({
            message: "User registered successfully",
            user:{
                id: newUser.id,
                name:newUser.name,
                email: newUser.email
            }
        });

    }
    catch(error){
        res.status(500).json({
            message:"Registration failed",
            errpr:error.message
        });
    }
});


router.post("/login", async (req, res)=>{
    try{
        const{email, password}= req.body;

        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({
                message:"Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if(!isPasswordCorrect){
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn : "7d"}
        );

        res.status(200).json({
            message:"Login successful",
            token,
            user:{
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch(error){
        res.status(500).json({
            message:"Login Failed",
            error: error.message
        });
    }
});

router.get("/profile", protect, async (req,res)=>{
    try{
        const user = await User.findById(req.user).select("-password");
        res.status(200).json(user);
    }
    catch(error){
        res.status(500).json({
            message:"Failed to fetch profile",
            error: erro.message
        });
    }
});

module.exports = router;