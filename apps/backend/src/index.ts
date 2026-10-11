import express, {
 type NextFunction,
 type Request,
 type Response,
} from "express";
import cors from "cors";
const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (request, response) => {
 response.send("<h1>Hello World!</h1>");
});

const unknownEndpoint = (request: Request, response: Response) => {
     response.status(404).send({ error: "unknown endpoint" });
};

app.use(unknownEndpoint);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});
