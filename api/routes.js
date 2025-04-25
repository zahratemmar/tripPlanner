// @ts-check

import express from "express"
import upload from './middlewares/upload.js';
import {verifyToken} from "./middlewares/authMiddleware.js"

import { 
    signupController,
    signinController,
    helloController,
    contactController,
    registerNodeController,
    getProfileController,
    editProfileController,
    cancelTripController
} from "./controllers.js";

import { 
    getTripsController,
    getServicesController,
    addServiceController,
    consensusController ,
    participateController
} from "./controllers.js";

const router = express.Router();

router.post("/signup", signupController);
router.post("/signin", signinController);
router.get("/hello",verifyToken,helloController)
router.get("/trips",verifyToken,getTripsController)
router.get("/services",verifyToken,getServicesController)
router.post("/registerNode",registerNodeController)
router.post('/addService',verifyToken, upload.single('image'),addServiceController);
router.post("/verify",consensusController)
router.post("/participate",verifyToken,participateController)
router.post("/cancelTrip",verifyToken,cancelTripController)
router.get("/profile",verifyToken,getProfileController)
router.post("/profile",verifyToken,editProfileController)
router.post("/contact",verifyToken,contactController)




export default router;


