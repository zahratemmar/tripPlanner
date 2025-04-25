import express from "express"
import router from "./routes.js";
import path from 'path';

const app = express();
const port = 3000;
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join('uploads')));
app.use("/", router);
app.listen(port, () => {
	console.log("app listening at port", port)
})

