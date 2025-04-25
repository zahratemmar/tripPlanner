import {getRandomNode,launchConsensus} from './nodeServices.js';
import {sendBatchPayouts} from '../middlewares/paypal.js'
import {bunchmail, getBankUrl} from './userServices.js'
import {newTrip} from '../templates/newTrip.js'
import {participation} from '../templates/participation.js'
import rp from 'request-promise';
import { tripCancelled } from '../templates/tripCancelled';
import { db } from "../db/db.js";
import { users  } from "../db/schema.js";
import { eq ,inArray, sql } from 'drizzle-orm';

 


 
export async function getTrips(location,userId,userType,flag) {
    try { 
        const node = await getRandomNode();
        const url = node.url+'/getTrips'
        const registerOption ={
            uri : url,
            method : 'GET',
            json : true
        };
        let result = await rp(registerOption);
        console.log("Result from node:", result);
        if (location) {
            result = result.filter(trip => trip.transactions.tripData.location == location);
        }
        if(flag && userType != "user"){
            if (userType == "host") result = result.filter(trip => trip.transactions.houseData.hid == userId);
            if (userType == "transport") result = result.filter(trip => trip.transactions.transportData.tid == userId);
            if (userType == "guide") result = result.filter(trip => trip.transactions.guideData.gid == userId);
        }
        if(flag && userType == "user"){
            result = result.filter(item => {
                const participators = item.transactions?.tripData?.participators || [];
                return participators.some(p => p.participator === userId);
              });
              
        }
        const trips =  result.map(trip => {
            return {
                id: trip.transactions.tripData.id,
                location: trip.transactions.tripData.location,
                price: trip.transactions.tripData.price,
                startDate : trip.transactions.tripData.startdate,
                endDate : trip.transactions.tripData.enddate,
                availableSpots : trip.transactions.tripData.availableSpots,
                spots : trip.transactions.tripData.spots,
                houseDescription : trip.transactions.houseData.description,
                transportDescription : trip.transactions.transportData.description,
                guideDescription : trip.transactions.guideData.description,
                description: trip.description,
            }
        })
        return trips;
      } catch (err) {
        console.error(err);
        return { status : -1 ,message: "Server error" }
      }

    } 
 


 
    export async function getServices(service,location,userId,flag) {
        try {
            const node = await getRandomNode();
            const body = {
                service : service,
                }
            if (location) {
                body.location = location;
            }
            const url = node.url+'/getService'
            const registerOption ={
                uri : url,
                method : 'GET',
                body : body,
                json : true
            };
            let result = await rp(registerOption);
            if(location) result = result.filter(service => service.location === location);
            if(flag){
                if (service == "house") result = result.filter(service => service.hid === userId);
                if (service == "transport") result = result.filter(service => service.tid === userId);
                if (service == "guide") result = result.filter(service => service.gid === userId);
            }
            console.log("Result from node:", result);
            return result;
          } catch (err) {
            console.error(err);
            return { status : -1 ,message: "Server error" }
          }
        } 
    
 
    export async function addService(serviceData,service) {
        const {leader} = await launchConsensus()
        console.log("serviceData",serviceData) 
        serviceData.bankUrl = await getBankUrl(serviceData.id)
        console.log(serviceData) 
        const body = {
            serviceData ,
            service 
            } 
        const url = leader+'/addService'
        const registerOption ={
            uri : url,
            method : 'POST',
            body : body,
            json : true
        };
        console.log("------------------------------------------------------------")
        const result = await rp(registerOption);
        if(result.trip){
            const data = {
                id: result.trip.transactions.tripData.id,
                location: result.trip.transactions.tripData.location,
                price: result.trip.transactions.tripData.price,
                startDate : result.trip.transactions.tripData.startdate,
                endDate : result.trip.transactions.tripData.enddate,
                availableSpots : result.trip.transactions.tripData.availableSpots,
                spots : result.trip.transactions.tripData.spots,
                houseDescription : result.trip.transactions.houseData.description,
                transportDescription : result.trip.transactions.transportData.description,
                guideDescription : result.trip.transactions.guideData.description,
                description: result.trip.description,
            }
            const servicesIds = [
                result.trip.transactions.houseData.hid,
                result.trip.transactions.transportData.tid,
                result.trip.transactions.guideData.gid
            ]
            const mailData=await newTrip(data)
            bunchmail(servicesIds,mailData)
            result.trip = data
        }
        return result

    }


export async function participate(tripId , userId , amount , spots){
    const {leader} = await launchConsensus();
try{
    const url = leader+'/addParticipation'
    const registerOption ={
        uri : url,
        method : 'POST',
        body : {
            participationData : {
                tripId ,
                participator : userId, 
                amount , 
                spots
            }
        },
        json : true
    };
    let result = await rp(registerOption);
    console.log("Result from node:", result);
    if(result.trip){
        const tripCoords = {  
            location : result.trip.transactions.tripData.location,
            startDate :result.trip.transactions.tripData.startdate,
            endDate : result.trip.transactions.tripData.enddate,
        }

        const mailData=await participation(tripCoords)
        bunchmail([userId],mailData)

        return ({
            status: 1,
            message: "Participation added successfully",
            })
    }
    return ({
        
			status: -1, 
			message: "Failed to save participation"
	   
    });
}catch(err){
    console.error(err);
    return ({
         status : -1 ,
        message: "Failed to save participation"
        })
    }
}

  

export async function launchVerification(){
    const {leader} = await launchConsensus();
    const url = leader+'/verifySmartContracts'
    const registerOption ={
        uri : url,
        method : 'POST',
        json : true
    };
    let result = await rp(registerOption);
    console.log("Result from node:");
    console.log(result);
    await db.update(users)
    .set({ totalTrips: sql`${users.totalTrips} + 1` })
    .where(inArray(users.id, result.allIds));
    //sendBatchPayouts(result)

}

 
export async function cancelTrip(tripId,userId){
    try{
    const {leader} = await launchConsensus()
    const url = leader+'/cancelTrip'
    const registerOption ={
        uri : url,
        method : 'POST',
        body : {
            tripId
        },
        json : true
    };
    let result = await rp(registerOption);
    console.log("Result from node:", result);
    const userIds = result.participators.map(user => user.participator)
    const mailData = await tripCancelled(result.tripData)
    //bunchmail(userIds,mailData)  
   const paybackData = await Promise.all(
        result.participators.map(async (user) => {
            const bankUrl = await getBankUrl(user.participator);
            return {
                bankUrl,
                amount: user.amount,
            };
        })
    );
    await db.update(users)
    .set({ 
        totalTrips: sql`${users.totalTrips} + 1`,
        totalFails: sql`${users.totalFails} + 1` 
     })
    .where(eq(users.id, userId));

    //sendBatchPayouts(paybackData)
    return result
}catch(err){
    console.error(err);
    return ({
         status : -1 ,
        message: "Failed to cancel trip"
        })
    }
} 