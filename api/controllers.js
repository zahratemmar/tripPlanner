import {signup,signin,getProfile,editProfile,contact} from "./services/userServices.js";
import {getTrips,getServices,addService,participate,launchVerification,cancelTrip} from "./services/tripServices.js";
import {registerNode} from "./services/nodeServices.js";
import { launchConsensus } from "./services/nodeServices.js";


export async function signupController(req, res) {
	const user = req.body;
	const result = await signup( user); 
	res.json(result);
}

export async function signinController(req, res) {
	const user = req.body;
	const result = await signin( user); 
	res.json(result);
}

export async function helloController(req, res) {
	res.json({message: "hello world"});
}


export async function getTripsController(req, res) {
	const location = req.body.location;
	const flag = req.body.flag;
	const userId = req.userId
	const userType = req.userType
	const result = await getTrips(location,userId,userType,flag);
	res.json(result);
}

export async function getServicesController(req, res) {
	const service = req.body.service;
	const location = req.body.location;
	const flag = req.body.flag;
	const userId = req.userId
	const result = await getServices(service,location,userId,flag);
	res.json(result);
}


export async function registerNodeController(req, res) {
	const newNode = req.body.newNode;
	const result = await registerNode(newNode);
	res.json(result);
}
 

export async function addServiceController(req, res) {
	const {serviceData,service} = JSON.parse(req.body.data);
	const image = req.file
	if(image){
		serviceData.description.image = `/uploads/${image.filename}`
	}
	serviceData.id= req.userId
	console.log("id"+req.userId)
	console.log(serviceData)
	const result = await addService(serviceData,service);
	res.json(result);
}



export async function consensusController(req, res) {
	const result = await launchVerification();
	res.json(result);	
}


export async function participateController(req, res) {
	const {tripId , amount , spots} = req.body.tripData
	const userId = req.userId
	const result = await participate(tripId , userId , amount , spots);
	res.json(result);	
}




export async function getProfileController(req, res) {
	const userId = req.userId;
	const result = await getProfile(userId);
	res.json(result);	
}

export async function editProfileController(req, res) {
	const userId = req.userId;
	const updateData = req.body
	const result = await editProfile(userId,updateData);
	res.json(result);	
}


export async function contactController(req, res) {
	const userId = req.userId;
	const contactData = req.body.contactData
	const result = await contact(userId,contactData);
	res.json(result);	
}
export async function cancelTripController(req,res){
	const userId = req.userId;
	const tripId = req.body.tripId
	const result = await cancelTrip(tripId,userId);
	res.json(result);
}
