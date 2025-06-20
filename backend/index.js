const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.once('open', () => {
  console.log('✅ Conectado a MongoDB Atlas correctamente');
});

const Persona = mongoose.model('Persona', {
  nombre: String,
  roles: [String],
  color: String
});
const fechaEventoSchema = new mongoose.Schema({
    fecha: String
});
const FechaEvento = mongoose.model('FechaEvento', fechaEventoSchema);


// Endpoints
app.get('/personas', async (req, res) => {
  const personas = await Persona.find();
  res.json(personas);
});

app.post('/personas', async (req, res) => {
  const persona = new Persona(req.body);
  await persona.save();
  res.json(persona);
});


const PORT = process.env.PORT || 3000;

const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

const noDisponibilidadSchema = new mongoose.Schema({
    fecha: String,            
    persona: String         
});

const NoDisponibilidad = mongoose.model('NoDisponibilidad', noDisponibilidadSchema);


app.get('/no-disponibilidades', async (req, res) => {
    const datos = await NoDisponibilidad.find();
    res.json(datos);
});


app.post('/no-disponibilidades', async (req, res) => {
    const { fecha, persona } = req.body;
    const existente = await NoDisponibilidad.findOne({ fecha, persona });
    if (existente) {
        return res.status(400).json({ mensaje: 'Ya existe esa no disponibilidad.' });
    }
    const nueva = new NoDisponibilidad({ fecha, persona });
    await nueva.save();
    res.json(nueva);
});

app.get('/fechas-eventos', async (req, res) => {
    const fechas = await FechaEvento.find();
    res.json(fechas);
});

app.post('/fechas-eventos', async (req, res) => {
    const { fecha } = req.body;
    const existente = await FechaEvento.findOne({ fecha });
    if (existente) {
        return res.status(400).json({ mensaje: 'Fecha ya existe' });
    }
    const nueva = new FechaEvento({ fecha });
    await nueva.save();
    res.json(nueva);
});

app.post('/fechas-eventos/lote', async (req, res) => {
    const { fechas } = req.body;
    if (!Array.isArray(fechas)) {
        return res.status(400).json({ mensaje: 'El cuerpo debe tener un array "fechas"' });
    }

    const existentes = await FechaEvento.find({ fecha: { $in: fechas } });
    const existentesSet = new Set(existentes.map(e => e.fecha));
    const nuevas = fechas.filter(f => !existentesSet.has(f)).map(f => ({ fecha: f }));

    if (nuevas.length === 0) {
        return res.json({ mensaje: 'No hay fechas nuevas para agregar' });
    }

    const insertadas = await FechaEvento.insertMany(nuevas);
    res.json(insertadas);
});
app.delete('/fechas-eventos/:fecha', async (req, res) => {
    const { fecha } = req.params;

    const resultado = await FechaEvento.deleteOne({ fecha });

    if (resultado.deletedCount === 0) {
        return res.status(404).json({ mensaje: 'Fecha no encontrada' });
    }

    res.json({ mensaje: 'Fecha eliminada correctamente' });
});

app.delete('/no-disponibilidad', async (req, res) => {
  const { fecha, persona } = req.body;
  try {
    const resultado = await NoDisponibilidad.deleteOne({ fecha, persona });
    if (resultado.deletedCount === 0) {
      return res.status(404).send('No se encontró esa no disponibilidad para eliminar');
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error en DELETE /no-disponibilidades:', error);
    res.status(500).send(error.message);
  }
});

app.delete('/fecha-eventos', async (req, res) => {
    try {
        await FechaEvento.deleteMany({});
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete('/no-disponibilidades', async (req, res) => {
    try {
        await NoDisponibilidad.deleteMany({});
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete('/personas', async (req, res) => {
    try {
        await Persona.deleteMany({});
        await NoDisponibilidad.deleteMany({}); // Opcional: limpiar también no disponibilidades asociadas
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});
app.delete('/personas/:nombre', async (req, res) => {
    try {
        const nombre = req.params.nombre;
        await Persona.deleteOne({ nombre });
        await NoDisponibilidad.deleteMany({ persona: nombre });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.put('/personas/:nombre', async (req, res) => {
    const nombre = req.params.nombre;
    const { color, roles } = req.body;

    try {
        const persona = await Persona.findOneAndUpdate(
            { nombre },
            { color, roles },
            { new: true }
        );

        if (!persona) return res.status(404).json({ mensaje: 'Persona no encontrada' });
        res.json(persona);
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});


