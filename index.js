const express = require('express');
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

const app = express();
const PORT = process.env.PORT || 9001;
const CSV_FILE_PATH_USUARIOS = './usuarios.csv';

let currentUserId = 0;

// Middleware
app.use(express.json());

// Configurar el escritor de CSV para usuarios
const userWriter = csvWriter({
    path: CSV_FILE_PATH_USUARIOS,
    header: [
        { id: 'id', title: 'ID' },
        { id: 'email', title: 'Email' },
        { id: 'nombre', title: 'Nombre' },
        { id: 'apellidos', title: 'Apellidos' },
    ],
    append: true,
});

// Inicializar el ID de usuarios leyendo el archivo CSV
const initializeUserId = () => {
    if (!fs.existsSync(CSV_FILE_PATH_USUARIOS)) return;

    fs.createReadStream(CSV_FILE_PATH_USUARIOS)
        .pipe(csvParser())
        .on('data', (row) => {
            const id = parseInt(row.ID, 10);
            if (id > currentUserId) currentUserId = id;
        })
        .on('end', () => {
            console.log(`ID de usuario inicializado. Próximo ID: ${currentUserId + 1}`);
        });
};

// Función para leer todos los usuarios del CSV
const readUsers = () => {
    return new Promise((resolve, reject) => {
        const usuarios = [];
        fs.createReadStream(CSV_FILE_PATH_USUARIOS)
            .pipe(csvParser())
            .on('data', (row) => usuarios.push(row))
            .on('end', () => resolve(usuarios))
            .on('error', (error) => reject(error));
    });
};

// POST: Crear un nuevo usuario
app.post('/api/usuarios', async (req, res) => {
    const { email, nombre, apellidos } = req.body;

    if (!email || !nombre || !apellidos) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    currentUserId += 1;
    const newUser = { id: currentUserId, email, nombre, apellidos };

    try {
        await userWriter.writeRecords([newUser]);
        res.status(201).json({ message: 'Usuario creado exitosamente.', usuario: newUser });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el usuario.' });
    }
});

// GET: Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await readUsers();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al leer los datos.' });
    }
});

// GET: Obtener un usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const usuarios = await readUsers();
        const usuario = usuarios.find((u) => parseInt(u.ID, 10) === id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el usuario.' });
    }
});

// PUT: Actualizar un usuario por ID
app.put('/api/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { email, nombre, apellidos } = req.body;

    try {
        const usuarios = await readUsers();
        const index = usuarios.findIndex((u) => parseInt(u.ID, 10) === id);
        if (index === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

        usuarios[index] = { ID: id.toString(), Email: email, Nombre: nombre, Apellidos: apellidos };

        const csvWriterUpdate = csvWriter({
            path: CSV_FILE_PATH_USUARIOS,
            header: [
                { id: 'ID', title: 'ID' },
                { id: 'Email', title: 'Email' },
                { id: 'Nombre', title: 'Nombre' },
                { id: 'Apellidos', title: 'Apellidos' },
            ],
        });

        await csvWriterUpdate.writeRecords(usuarios);
        res.json({ message: 'Usuario actualizado exitosamente.', usuario: usuarios[index] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el usuario.' });
    }
});

// DELETE: Eliminar un usuario por ID
app.delete('/api/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);

    try {
        const usuarios = await readUsers();
        const newUsuarios = usuarios.filter((u) => parseInt(u.ID, 10) !== id);

        const csvWriterUpdate = csvWriter({
            path: CSV_FILE_PATH_USUARIOS,
            header: [
                { id: 'ID', title: 'ID' },
                { id: 'Email', title: 'Email' },
                { id: 'Nombre', title: 'Nombre' },
                { id: 'Apellidos', title: 'Apellidos' },
            ],
        });

        await csvWriterUpdate.writeRecords(newUsuarios);
        res.json({ message: `Usuario con ID ${id} eliminado exitosamente.` });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el usuario.' });
    }
});

// Iniciar el servidor y cargar el ID inicial
app.listen(PORT, () => {
    initializeUserId();
    console.log(`API de usuarios corriendo en http://localhost:${PORT}`);
});