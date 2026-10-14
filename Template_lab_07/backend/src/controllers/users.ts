import express from "express";

const router = express.Router();

// TODO (P2): crear un usuario guardando el hash de la contraseña.
router.post("/", async (request, response) => {
  response.status(501).json({ error: "not implemented" });
});

// TODO (P2): listar los usuarios.
router.get("/", async (request, response) => {
  response.status(501).json({ error: "not implemented" });
});



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
router.post("/", async (request, response) => {
  const { username, email, password } = request.body;
  if (!username || !email || !password) {
    return response.status(400).json({ error: "username, email and password are required" });
  }
  if (password.length < 3) {
    return response.status(400).json({error: `password must be at least ${3} characters`,});
  }
  if (!EMAIL_REGEX.test(email)) {
    return response.status(400).json({ error: `email "${email}" is not valid` });
  }
  if (await User.exists({ username })) {
    return response.status(400).json({ error: `username "${username}" is already in use` });
  };

  if (await User.exists({ email })) {
    return response.status(400).json({ error: `email "${email}" is already in use` });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  const user = new User({
    username,
    email,
    passwordHash,
  });

  const savedUser = await user.save();
  response.status(201).json(savedUser);
});

router.get("/", async (request, response) => {
  const users = await User.find({});
  response.json(users);
});


export default router;
