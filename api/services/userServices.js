
import bcrypt from "bcrypt";
import { db } from "../db/db.js";
import { users , messages} from "../db/schema.js";
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'; 
import{sendMail} from '../middlewares/mailer.js'

dotenv.config();
  
    
 
   
export async function signup(user) {
    try {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email));
    
        if (existingUser.length > 0) {
          return {status : 0, message: "Email already in use" };
        } 
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const result = await db.insert(users).values({
          email :   user.email,
          hashedpwd: hashedPassword,
          name : user.name,
          firstName : user.firstName,
          userType : user.userType,
          bankUrl : user.paymentEmail,
          phoneNumber : user.phoneNumber,
        }).returning();
        console.log(result)
        const token = jwt.sign({ userId: result[0].id ,userType : result[0].userType}, process.env.JWT_SECRET, {
          expiresIn: '2h',
          }); 
      return {status : 1, message: "User created successfully",token: token};
      } catch (err) {
        console.error(err);
        return { status : -1 ,message: "Server error" }
      }
    } 
 


    
 
export async function signin(user) {
    try {
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email));
        if (dbUser.length === 0) {
          return {status : 0, message: "wrong credintals" };
        }
        const isMatch = await bcrypt.compare(user.password, dbUser[0].hashedpwd);
        if (!isMatch) {
            return {status : 0, message: "wrong credintals" };
          }
        const token = jwt.sign({ userId: dbUser[0].id ,userType : dbUser[0].userType}, process.env.JWT_SECRET, {
            expiresIn: '2h',
            }); 
        return {status : 1, message: "login successful",token: token};
      } catch (err) {
        console.error(err);
        return { status : -1 ,message: "Server error" }
      }
    } 
 


  
 
export async function getProfile(userId) {
      try {

          let dbUser = await db 
            .select()
            .from(users)
            .where(eq(users.id, userId));
           
          if (dbUser.length === 0) {
            return {status: -1, message: "Server error"};
          }
          dbUser = dbUser[0]
          delete dbUser.hashedpwd
          dbUser.rating =  dbUser.totalTrips==0  ?  1 :  ((dbUser.totalTrips-dbUser.totalFails)/dbUser.totalTrips)
          return {status : 1, profile : dbUser};
        } catch (err) {
          console.error(err);
          return { status : -1 ,message: "Server error" }
        }
      } 
 
      



export async function editProfile(userId,updateData) {
      try {
        console.log(updateData)
        const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning(); 
 
        return {status: 1,message: "profile edited successfully"} 

        } catch (err) {

          console.error(err);
          return { status : -1 ,message: "couldn't edit profile" }

        }
      } 



export async function getBankUrl(id) {
        try {
          console.log("id in get bank : ",id)
            const dbUser = await db
              .select( {bankUrl: users.bankUrl})
              .from(users)
              .where(eq(users.id, id));
        
            if (dbUser.length === 0) {
              return null;
            }
            console.log("dbUser",dbUser[0])
            return dbUser[0].bankUrl

          } catch (err) {
            console.error(err);
            return error
          }
        } 
     
    
export async function getEmail(id) {
        try {
          console.log("id in get bank : ",id)
            const dbUser = await db
              .select( {email: users.email})
              .from(users)
              .where(eq(users.id, id));
        
            if (dbUser.length === 0) {
              return null;
            }
            console.log("dbUser",dbUser[0])
            return dbUser[0].email

          } catch (err) {
            console.error(err);
            return error
          }
        } 
 
        





export async function contact(userId,contactData) {
      try {
        const insertedData ={
          message: contactData.message,
          userId: userId,
        }
        const result = await db.insert(messages).values(insertedData).returning();
        return {status: 1,message: "your inquery has been sent successfully"} 

        } catch (err) {
          console.error(err);
          return { status : -1 ,message: "couldn't send inquery" }
        }
      }



export async function bunchmail(userIds,mailData){
  for (let i = 0; i < userIds.length; i++) {
    mailData.to = await getEmail(userIds[i])
    await sendMail(mailData)
} 

}