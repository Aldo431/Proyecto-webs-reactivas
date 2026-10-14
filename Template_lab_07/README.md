# LABORATORIO 7

# P1.

---
Dentro de ```./backend/src/models/user.ts```

Creamos primero el Schema, con los campos *username*, *email* y *passwordHash*, todos deben ser obligatorios (```requiered: true```).

*email* debe validarse con la expresión regular ```/^[^\s@]+@[^\s@]+\.[^\s@]+$/```

```ts
const userSchema = new mongoose.Schema<UserData>({
  username: { type: String, required: true, unique: true },
  email: { type: String, 
    required: true, 
    unique: true, 
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
      "Please enter a valid email",
    ],
  },
  passwordHash: { type: String, required: true },
});
```

Luego, al transformar un usuario a JSON, para que no aparezcan  ```__id, __v ```ni el  ```passwordHash ```:

```ts
User.schema.set("toJSON", {
  transform: (document, returnedObject: {
    id?: string;
    _id?: mongoose.Types.ObjectId;
    __v?: number;
    passwordHash?: string;
  }) => {
    returnedObject.id = returnedObject._id?.toString();
    delete returnedObject._id; //eliminamos _id
    delete returnedObject.__v; //eliminamos __v
    delete returnedObject.passwordHash; //eliminamos passwordHash
  }
});
```
Ahora, desde ```./backend/src/models/post.ts```

Dentro de la interfaz agregamos un campo user que referencie a su autor:
```ts
export interface Post {
  ...
  user?: mongoose.Types.ObjectId;
  ...
}
```

También lo agregamos al Schema:

```ts
const postSchema = new mongoose.Schema<Post>(
  {
    ...
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ...
    
  }
```
---
# P2.
Dentro de ```./backend/src/controllers/users.ts```

Donde realizamos las validaciones sobre el *username, email y password*.
Ademas, guardamos el hash de la contraseña junto al usuario.
```ts
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

```
Luego desde ```./backend/src/utils/middleware.ts```:
```ts
const errorHandler = (
  error: { name: string; message: string, code?: number; keyValue?: Record<string, unknown> },
  request: Request,
  response: Response,
  next: NextFunction
) => {
  ...
  } else if (error.code === 11000) {
    const [field, value] = Object.entries(error.keyValue ?? {})[0] ?? [];
    response.status(400).json({
      error: `${field} "${value}" is already in use`
    });
...
};
```

Por último, desde ```./backend/src/controllers/users.ts```:

```ts
router.get("/", async (request, response) => {
  const users = await User.find({});
  response.json(users);
});
```
---
# P3.
Desde ```./backend/src/controllers/login.ts```:
```ts
const TOKEN_LIFETIME_SECONDS = 60 * 60;
const DUMMY_HASH = "$2b$10$XaOQIOfXg1FdfHMRXDeQyebA6gh8vsSirzz.TGxmQqHAgr2DYNDB.";

router.post("/", async (request, response) => {
  const { username, password } = request.body;
  const user = await User.findOne({ username });
  const passwordCorrect = await bcrypt.compare(
    password ?? "",
    user?.passwordHash ?? DUMMY_HASH
  );
  if (!user || !passwordCorrect) {
    return response.status(401).json({ error: "invalid username or password" });
  }

  const csrf = crypto.randomUUID();
  const token = jwt.sign(
    { id: user._id, username: user.username, csrf },
    config.JWT_SECRET,
    { expiresIn: TOKEN_LIFETIME_SECONDS }
  );

  response.setHeader("X-CSRF-Token", csrf);
  response.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_LIFETIME_SECONDS * 1000,
  });

  return response.status(200).json({ username: user.username });
});
```

---
# P4.
Desde ```./backend/src/utils/middleware.ts```:

Modificamos el middleware ```errorHandler```:
```ts
const errorHandler = (
  error: { name: string; message: string, code?: number; keyValue?: Record<string, unknown> },
  request: Request,
  response: Response,
  next: NextFunction
) => {
  ...
  } else if (error.name === "TokenExpiredError") {
    response.status(401).json({ error: "token expired" });
  }
  ...
};
```

Implementamos el middleware ```withUser```:
```ts
export const withUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req;
    const token = authReq.cookies?.token;
    if (!token) {
      res.status(401).json({ error: "token missing" });
      return;
    }else {
      const decodedToken = jwt.verify(token, config.JWT_SECRET);
      const csrfToken = req.headers["x-csrf-token"];
      if (typeof decodedToken === "object" && decodedToken.id && decodedToken.csrf == csrfToken) {
        authReq.userId = decodedToken.id;
        next();
        return;
      } else {
        res.status(401).json({ error: "invalid token" });
        return;
      }
    }
  } catch (error) {
    res.status(401).json({ error: "invalid token" });
  }
};
```

Desde ```./backend/src/controllers/login.ts```:

Para ```GET```:

Donde responde con el usuario de la sesion
```ts
router.get("/me", withUser, async (request, response) => {
  const user = await User.findById(request.userId);
  if (!user) {
    return response.status(401).json({ error: "invalid token" });
  }
  return response.json(user.toJSON());
});
```

Para ```POST```:

Donde borramos la cookie
```ts
router.post("/logout", async (_request, response) => {
  response.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return response.status(204).end();
});
```
---
# P5.
Desde ```./backend/src/utils/middleware.ts```:

Este middleware deja pasar las peticiones sin cookie
```ts
export const withOptionalUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.cookies?.token) {
    next();
    return;
  }
  await withUser(req, res, next);
};
```

Desde ```./backend/src/controllers/posts.ts```:

```POST para /api/threads```
 
```ts
router.post("/threads", withOptionalUser, async (request, response) => {
  const { content } = request.body;
  let author = request.body.author;
  let user: mongoose.Types.ObjectId | null = null;

  if (request.userId) {
    const u = await User.findById(request.userId);
    author = u?.username ?? "Anónimo";
    user = new mongoose.Types.ObjectId(request.userId);
  } else {
    const a = typeof author === "string" ? author.trim() : "";
    author = a || "Anónimo";
    user = null;
  }

  const post = new PostModel({ content, author, user, thread: null });
  const savedPost = await post.save();
  response.status(201).json(savedPost);
});
```

```POST para /api/threads:id```
```ts
router.post("/threads/:id", withOptionalUser, async (request, response) => {
  const { content, parent } = request.body;
  let author: string | undefined = request.body.author;
  let user: mongoose.Types.ObjectId | null = null;

  if (request.userId) {
    const u = await User.findById(request.userId);
    author = u?.username ?? "Anónimo";
    user = new mongoose.Types.ObjectId(request.userId);
  } else {
    const a = typeof author === "string" ? author.trim() : "";
    author = a || "Anónimo";
    user = null;
  }

  const post = new PostModel({
    content,
    author,
    user,
    thread: request.params.id,
    parent: parent || null,
  });

  const savedPost = await post.save();
  response.status(201).json(savedPost);
});
```
---
# P6.
Desde ```./frontend/src/services/login.ts```:

Implementamos:
- *login* el cual guarda el token CSRF del header en local storage.
- *restoreLogin* para resguardar el login al recargar.
- *logout* para borrar el token y asi desloguearnos.

```ts
import axios from 'axios'
import type { User } from '../types/users'
import secureAxios from '../utils/axiosSecure'

const baseUrl = '/api/login'

type LoginData = {
  username: string
  password: string
}

const login = async (data: LoginData) => {
  const response = await axios.post(baseUrl, data)
  const csrfToken = response.headers['x-csrf-token'] || response.headers['X-CSRF-Token']
  if (csrfToken) {
    localStorage.setItem('csrfToken', csrfToken)
  }
  return response.data as { username: string }
}

const restoreLogin = async () => {
    try {
        const response = await secureAxios.get<User>(`${baseUrl}/me`);
        return response.data;
    } catch {
        return null;
    }
}

const logout = async () => {
  localStorage.removeItem('csrfToken')
  await axios.post(`${baseUrl}/logout`)
}

export default { login, restoreLogin, logout }

```

Desde ```./frontend/src/utils/axiosSecure.ts```:

Creamos una instancia de axios que envie el header X-CSRF-Token en cada peticion
```ts
import axios from 'axios';

const secureAxios = axios.create({
  withCredentials: true, // Include cookies in requests
});

secureAxios.interceptors.request.use((config) => {
  const csrfToken = localStorage.getItem('csrfToken');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

export default secureAxios;
```

Desde ```./frontend/src/services/threads.ts```:

Modificamos ```create``` y ```  createComment``` para que ambos pasen a usar ```secureAxios```.
```ts
import axios from 'axios'
import secureAxios from '../utils/axiosSecure'
import type { Post } from '../types/posts'

const baseUrl = `/api/threads`
...
const create = (data: ThreadCreateData) => {
  return secureAxios.post<Post>(`${baseUrl}`, data).then(request => request.data)
}
...
const createComment = (data: CommentCreateData, threadId: string) => {
  return secureAxios.post<Post>(`${baseUrl}/${threadId}`, data).then(request => request.data)
}
...
 ```

Desde ```./frontend/src/pages/Login.tsx```:

 (login → restoreLogin → setUser → navigate a /threads)
 ```ts
 ...
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import loginService from '../services/login'
...

const Login = ({ setUser }: LoginProps) => {
  ...
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await loginService.login({ username, password })
      const user = await loginService.restoreLogin()
      setUser(user)
      navigate('/threads')
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError('invalid username or password')
      }
    }
  }

  return {
    ...
  }
}
 ```

Desde ```./frontend/src/components/TopBar.tsx```:

Mostramos el boton para cerrar sesion
 ```ts
 ...
 import loginService from '../services/login'
 ...

 function TopBar({ user, setUser }: TopBarProps) {
  const handleLogout = async () => {
    try {
      await loginService.logout()
    } catch (e) {
      // ignore
    } finally {
      setUser(null)
    }
  }
  return (
    ...
  )
 }
 ```

Desde ```./frontend/src/App.tsx```:

Restauramos la sesion al montar App.tsx

```ts
...
import { useEffect } from 'react'
...
useEffect(() => {
    const restore = async () => {
      try {
        const u = await loginService.restoreLogin()
        setUser(u)
      } catch (e) {
        setUser(null)
      }
    }
    restore()
  }, [])
```