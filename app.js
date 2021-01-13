const express = require('express');
const mysql = require('mysql');
const util = require('util');

const app = express();
const port = 3000;
app.use(express.json());

// Conexion con mysql
const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root', //aquí poner las credenciales que correspondan
    password: '', //aquí poner las credenciales que correspondan
    database: 'library'
});
conexion.connect((error)=>{
    if(error) {
        throw error;
    }
    console.log('Conexion con la DB mysql establecida');
});

const qy = util.promisify(conexion.query).bind(conexion); // para async-await

// Desarrollo de la lógica de negocio

// Clase MyError que extiende Error para manejar errores inesperados
class MyError {
    constructor(message) {
        this.name = 'MyError';
        this.message = message;
    }
}
MyError.prototype = new Error;

/*
*
* Categoria
*
*/

app.post("/categoria", async (req, res)=>{
    try {
        // Valido la info
        if (!req.body.nombre || req.body.nombre == '') {
            throw new MyError('Falta enviar el nombre');
        }
        const nombre = req.body.nombre.toUpperCase();

        // Valido que no exista la categoria
        let query = 'SELECT id FROM categoria WHERE nombre = ?';
        let rs = await qy(query, [nombre]);
        if (rs.length > 0) {
            throw new MyError('La categoria ' + nombre + ' ya existe');
        }
        
        // Guardo la nueva categoria
        query = 'INSERT INTO categoria (nombre) VALUE (?)';
        rs = await qy(query, [nombre]);
        const mens = 'Se creó la categoria ' + nombre + ' satisfactoriamente, con el id ' + rs.insertId;
        res.status(200).send({"id": rs.insertId,"nombre": nombre, "mensaje": mens});

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.get('/categoria', async (req, res)=>{
    try {
        const query = 'SELECT * FROM categoria';
        const rs = await qy(query);
        res.status(200).send({"respuesta": rs});

    } catch (e) {
        console.error(e.message);
        res.status(413).send([]);
    }
});

app.get('/categoria/:id', async (req, res)=>{
    try {
        // Valido que exista la categoria
        const query = 'SELECT * FROM categoria WHERE id = ?';
        const rs = await qy(query, [req.params.id]);
        if (rs.length == 0){
            throw new MyError('No existe una categoria con ese id.');
        }

        res.status(200).send({"respuesta": rs});

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.delete("/categoria/:id", async (req, res)=>{
    try {
        let query = 'SELECT * FROM libro WHERE categoria_id = ?';
        let rs = await qy(query, [req.params.id]);
        if (rs.length > 0) {
            throw new MyError("Esta categoria tiene libros asociados, no se puede borrar");
        }

        query = 'SELECT * FROM categoria WHERE id = ?';
        rs = await qy(query, [req.params.id]);
        if (rs.length == 0){
            throw new MyError('No existe una categoria con ese id.');
        }

        query = 'DELETE FROM categoria WHERE id = ?';
        rs = await qy(query, [req.params.id]);
        res.status(200).send({'mensaje': "La categoria se borró correctamente"});

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

/*
*
* Persona
*
*/

app.post('/persona', async (req, res)=>{
    try {
        // Validación de datos
        if (!req.body.nombre || !req.body.apellido || !req.body.email || !req.body.alias) {
            throw new MyError('Faltan datos');
        }

        if (!evalidator.validate(req.body.email)) { // otra forma: if (!req.body.email.includes('@') || !req.body.email.includes('.'))
            throw new MyError('El email no es valido');
        }

        // Verifico si la persona ya existe
        const email = req.body.email;
        let query = 'SELECT id FROM persona WHERE email = ?';
        let rs = await qy(query, [email]);
        if (rs.length > 0) {
            throw new MyError('El email ' + email + ' ya se encuentra registrado');
        }
        
        // Guardo la persona
        query = 'INSERT INTO persona (nombre, apellido, email, alias) VALUE (?,?,?,?)';
        rs = await qy(query, [req.body.nombre.toUpperCase(), req.body.apellido.toUpperCase(),
             email.toUpperCase(), req.body.alias.toUpperCase()]);
        res.status(200).send({'mensaje': "Se creó satisfactoriamente la persona con los siguientes datos:",
                                'id': rs.insertId,'nombre': req.body.nombre,'apellido': req.body.apellido,
                                'email':email, 'alias':req.body.alias});

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.get('/persona', async (req, res)=>{
    try {
        const query = 'SELECT * FROM persona';
        const rs = await qy(query);
        res.status(200).send({"respuesta" : rs});

    } catch(e){
        console.error(e.message)
        res.status(413).send([]);

    }
});

app.get('/persona/:id', async (req, res)=>{
    try {
        const query = 'SELECT * FROM persona WHERE id = ?';
        const rs = await qy(query, [req.params.id]);
        if (rs.length == 0){
            throw new MyError('No se encuentra una persona con el id ' + req.params.id);
        }
        res.status(200).send({"respuesta": rs});

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.put('/persona/:id', async (req, res) => {
    try {
        // Valido que exista la persona
        const query = 'SELECT * FROM persona WHERE id = ?';
        const rs = await qy(query, [req.params.id]);
        if (rs.length == 0){
            throw new MyError('No se encuentra una persona con el id ' + req.params.id);
        }
        
        //Verifico que el mail no se modifique
        if(rs[0].email != req.body.email){
            throw new MyError("El mail no puede ser modificado");
        }
        
        // Modifico los datos
        query = 'UPDATE persona SET nombre = ?, apellido = ?, alias = ? WHERE id = ?';
        rs = await qy(query, [req.body.nombre, req.body.apellido, req.body.alias, req.params.id]);
        res.status(200).send("Los datos fueron modificados");

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});


app.delete('/persona/:id', async (req, res) => {
    try{
        // Valido que la persona no tenga libros asociados
        let query = 'SELECT * FROM libro WHERE persona_id = ?';
        let rs = await qy(query, [req.params.id]);
        if (rs.length > 0){
            throw new MyError('Este persona tiene libros asociados, no es posible borrarla');
        }

        query = "DELETE FROM persona WHERE id = ?";
        rs = await qy(query, [req.params.id])
        res.status(200).send({'mensaje': "Se borró correctamente"});

    } catch(e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }    
});

/*
*
* Libro
*
*/

app.post('/libro', async (req, res)=>{
    try{
        // Reviso datos obligatorios
        if (!req.body.nombre || !req.body.categoria_id) {
            throw new MyError('Nombre y categoria son datos obligatorios');
        }
        const nombre = req.body.nombre.toUpperCase();

        // Chequeo que el libro no esté registrado
        let query = 'SELECT id FROM libro WHERE nombre = ?';
        let rs = await qy(query, [nombre]);
        if (rs.length > 0) {
            throw new MyError('El libro ' + nombre + ' ya se encuentra registrado');
        }

        // Chequeo que la categoria exista
        const categoria_id = req.body.categoria_id;
        query = 'SELECT id FROM categoria WHERE id = ?';
        rs = await qy(query, [categoria_id]);    
        if (rs.length == 0) {
            throw new MyError('No existe la categoria indicada');
        }

        // Si se provee persona, chequeo que exista
        const persona_id = req.body.persona_id;
        if (persona_id) {
            query = 'SELECT id FROM persona WHERE id = ?';
            rs = await qy(query, [persona_id]);
            if (rs.length == 0) {
                throw new MyError('Esa persona no existe');
            }
        }

        let desc = null;
        desc = req.body.descripcion == null ? desc : desc = req.body.descripcion.toUpperCase();

        // Inserto el libro
        query = 'INSERT INTO libro (nombre, descripcion, categoria_id, persona_id) VALUE (?,?,?,?)';
        rs = await qy(query, [nombre, desc, categoria_id, persona_id]);
        console.log(rs);
        res.status(200).send({'mensaje': "Se creó satisfactoriamente el libro con los siguientes datos:",
                                'id':rs.insertId,'nombre': nombre,'descripcion': desc,
                                'categoria_id': categoria_id, 'persona_id': persona_id});

    } catch(e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }

    }
});

app.get('/libro', async (req, res)=>{
    try {
        const query = 'SELECT * FROM libro';
        const rs = await qy(query);
        res.status(200).send({"respuesta": rs})

    } catch (e) {
        console.error(e.message);
        res.status(413).send({"Error": e.message});
    }
});

app.get('/libro/:id', async (req, res)=>{
    try {
        const query = 'SELECT * FROM libro WHERE id = ?';
        const rs = await qy(query, [req.params.id]);
        if (rs.length == 0) {
            throw new MyError('No se encuentra ese libro');
        }
        res.status(200).send({"respuesta": rs});

    } catch (e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.put('/libro/:id', async (req, res)=>{
    try{
        // Sólo se puede modificar la descripción, verifico que se haya enviado una
        if(!req.body.descripcion) {
            throw new MyError("No enviaste una nueva descripcion");
        }

        // Verifico que exista el libro que se quiere modificar
        let query = 'SELECT * FROM libro WHERE id = ?';
        let rs = await qy(query, [req.params.id]);
        if (rs.length == 0) {
            throw new MyError("Ese libro no existe");
        } // Verifico que no se hayan querido modificar otros datos
        else if (req.body.nombre.toUpperCase() != rs[0].nombre || req.body.categoria_id != rs[0].categoria_id ||
             req.body.persona_id != rs[0].persona_id) {
            throw new MyError("Solo puede modificarse la descripcion");
        }
        
        // Hago las modificaciones
        query = 'UPDATE libro SET descripcion = ? WHERE id = ?';    
        rs = await qy(query, [req.body.descripcion.toUpperCase(), req.params.id]);
        res.status(200).send({'mensaje': "Se modificó satisfactoriamente el libro con los siguientes datos:",
                                'id':req.body.id,'Nombre':req.body.nombre,'Descripcion':req.body.descripcion,
                                'categoria_id':req.body.categoria_id, 'persona_id':req.body.persona_id});

    }
    catch(e){
        console.error(e.message)
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.put('/libro/prestar/:id', async (req, res)=>{
    try{
        // Verifico que se haya mandado la persona
        if(!req.body.persona_id) {
            throw new MyError("Debe indicarse una persona");
        }
        
        // Verifico que exista el libro
        let query = "SELECT * FROM libro WHERE id = ?";
        let rs = await qy(query, [req.params.id]);
        if (rs.length == 0){
            throw new MyError("Ese libro no existe");
        }

        // Verifico que exista la persona
        query = "SELECT id FROM persona WHERE id = ?";
        rs = await qy(query, [req.body.persona_id]);
        if (rs.length == 0){
            throw new MyError("Esa persona no existe en la base de datos");
        }

        // Verifico que el libro no esté prestado
        query = "SELECT persona_id FROM libro WHERE id = ?";
        rs = await qy(query, [req.params.id]);
        console.log()
        if (rs[0].persona_id != null){
            throw new MyError("Ese libro se encuentra prestado, no se puede prestar hasta que no sea devuelto");
        }
        
        // Hago el préstamo
        query = 'UPDATE libro SET persona_id = ? WHERE id = ?';    
        rs = await qy(query, [req.body.persona_id, req.params.id]);
        res.status(200).send({'mensaje':"El libro se prestó correctamente"});

    } catch(e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.put('/libro/devolver/:id', async(req, res)=>{
    try{
        // Verifico que el libro exista en la DB
        let query = "SELECT * FROM libro WHERE id=?";
        let rs = await qy(query, [req.params.id]);
        if (rs.length == 0){
            throw new MyError("Ese libro no existe en la base de datos");
        }

        // Verifico que el libro esté prestado
        if (rs[0].persona_id == null){
            throw new MyError("Ese libro no estaba prestado!");
        }

        // Hago la devolución
        query = 'UPDATE libro SET persona_id = ? WHERE id = ?';    
        rs = await qy(query, [null, req.params.id]);
        res.status(200).send({'mensaje':"El libro se devolvio correctamente"});

    } catch(e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }
});

app.delete('/libro/:id', async(req, res)=>{
    try{
        // Verifico que exista el libro
        let query = "SELECT * FROM libro WHERE id=?";
        let respuesta = await qy(query, [req.params.id]);
        if (respuesta.length == 0){
            throw new MyError("Ese libro no existe");
        }

        // Verifico que no esté prestado
        query = "SELECT persona_id FROM libro WHERE id = ?";
        respuesta = await qy(query, [req.params.id]);
        if (respuesta[0].persona_id != null){
            throw new Error("El libro se encuentra prestado, no se puede borrar")
        }

        // Elimino el libro
        query = "DELETE FROM libro WHERE id = ?";
        respuesta = await qy(query, [req.params.id])
        res.status(200).send({'mensaje':"El libro se borro correctamente"});

    } catch(e) {
        console.error(e.message);
        if (e instanceof MyError) {
            res.status(413).send({"Error": e.message});
        } else {
            res.status(413).send({"Error": 'Error inesperado'});
        }
    }    
});

// Servidor
app.listen(port, ()=>{
    console.log('Express iniciado en el puerto ', port, '.');
});