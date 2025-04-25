import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();



export function verifyToken(req, res, next) {
const token = req.header('Authorization');
if (!token) return res.json({status : -2, message: 'Access denied' });
try { 
 const decoded = jwt.verify(token, process.env.JWT_SECRET);
 req.userId = decoded.userId;
 req.userType = decoded.userType;
 next();
 }
catch (error) {
 res.json({status : -2, message: 'Access denied' });
 }
};

  