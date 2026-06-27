// Endpoints segmentados por pestaña de SheetDB
const API_BASE_REGISTRO = 'https://sheetdb.io/api/v1/uqbm96dji3sqz?sheet=BASE DE REGISTRO';
const API_CLIENTES = 'https://sheetdb.io/api/v1/uqbm96dji3sqz?sheet=CLIENTES';
const API_PRODUCTO = 'https://sheetdb.io/api/v1/uqbm96dji3sqz?sheet=PRODUCTO';
const API_UM = 'https://sheetdb.io/api/v1/uqbm96dji3sqz?sheet=UM';

const CREDENCIALES = { user: 'admin', pass: 'rediplast2026' };

let catalogoUMGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formAccesoPrivado')) {
        document.getElementById('formAccesoPrivado').addEventListener('submit', procesarAutenticacionPrivada);
    }

    if (document.getElementById('bodyMatriz')) {
        cargarDatalistsCatalogos();
        for (let i = 0; i < 5; i++) { agregarFilaMatriz(); }
        document.getElementById('masterFechaR').valueAsDate = new Date();
    }

    if (document.getElementById('tbodyHistorial')) {
        cargarHistorialCompleto();
        configurarBuscadorMultivariable();
    }

    if (document.getElementById('formNuevoDato')) {
        document.getElementById('formNuevoDato').addEventListener('submit', guardarNuevoCatalogoExcel);
    }
});

function solicitarAccesoRuta(destino) {
    if (localStorage.getItem('rediplast_admin_session') === 'active') {
        window.location.href = destino;
    } else {
        localStorage.setItem('rediplast_target_route', destino);
        window.location.href = 'login.html';
    }
}

function procesarAutenticacionPrivada(e) {
    e.preventDefault();
    const u = document.getElementById('privUsuario').value.trim();
    const p = document.getElementById('privContrasena').value;

    if (u === CREDENCIALES.user && p === CREDENCIALES.pass) {
        localStorage.setItem('rediplast_admin_session', 'active');
        const target = localStorage.getItem('rediplast_target_route') || 'dashboard.html';
        localStorage.removeItem('rediplast_target_route');
        window.location.href = target;
    } else {
        alert('❌ Credenciales de acceso incorrectas.');
    }
}

function cerrarSesionAdmin() {
    localStorage.removeItem('rediplast_admin_session');
    window.location.href = 'index.html';
}

function agregarFilaMatriz() {
    const tbody = document.getElementById('bodyMatriz');
    if (!tbody) return;

    const tr = document.createElement('tr');
    let optionsUM = '';

    if (catalogoUMGlobal.length > 0) {
        catalogoUMGlobal.forEach(um => {
            optionsUM += `<option value="${um}">${um}</option>`;
        });
    } else {
        optionsUM = `<option value="MILLARES">MILLARES</option>`;
    }

    tr.innerHTML = `
        <td><input type="text" class="m-producto" list="lista-productos" placeholder="Buscar producto..."></td>
        <td><input type="text" class="m-medida" placeholder="Ej: 4X8X4"></td>
        <td><input type="text" class="m-lote" placeholder="Ej: 1234"></td>
        <td><input type="date" class="m-fechaP"></td>
        <td><input type="number" step="any" class="m-cantidad" value="0"></td>
        <td><select class="m-um">${optionsUM}</select></td>
        <td><input type="text" class="m-peso" placeholder="Ej: 12.5"></td>
        <td><input type="text" class="m-bulto" placeholder="Ej: 2"></td>
        <td><input type="text" class="m-correlativo" placeholder="Ej: RDP26-0003"></td>
    `;
    tbody.appendChild(tr);
}

// Carga asíncrona concurrente separada por pestañas independientes
function cargarDatalistsCatalogos() {
    Promise.all([
        fetch(API_PRODUCTO).then(res => res.json()),
        fetch(API_UM).then(res => res.json()),
        fetch(API_CLIENTES).then(res => res.json())
    ])
        .then(([productos, ums, clientes]) => {
            const oldList = document.getElementById('lista-productos');
            if (oldList) oldList.remove();

            const listProd = document.createElement('datalist');
            listProd.id = 'lista-productos';
            const listCli = document.getElementById('lista-clientes');

            const setProds = new Set();
            const setUms = new Set();
            const setClis = new Set();

            productos.forEach(f => { if (f.PRODUCTO && f.PRODUCTO.trim() !== "") setProds.add(f.PRODUCTO.trim()); });
            ums.forEach(f => { if (f.UM && f.UM.trim() !== "") setUms.add(f.UM.trim()); });
            clientes.forEach(f => { if (f.CLIENTES && f.CLIENTES.trim() !== "") setClis.add(f.CLIENTES.trim()); });

            catalogoUMGlobal = Array.from(setUms);

            document.querySelectorAll('.m-um').forEach(select => {
                select.innerHTML = '';
                catalogoUMGlobal.forEach(um => {
                    select.innerHTML += `<option value="${um}">${um}</option>`;
                });
            });

            setProds.forEach(p => listProd.innerHTML += `<option value="${p}">`);
            if (listCli) {
                listCli.innerHTML = "";
                setClis.forEach(c => listCli.innerHTML += `<option value="${c}">`);
            }
            document.body.appendChild(listProd);
        }).catch(err => console.error("Error al poblar catálogos consolidados:", err));
}

function guardarMatrizAExcel() {
    const cliente = document.getElementById('masterCliente').value.toUpperCase().trim();
    const fechaRRaw = document.getElementById('masterFechaR').value;

    if (!cliente || !fechaRRaw) {
        alert('⚠️ Error: Debes definir el Cliente y la Fecha R. en la sección superior antes de grabar.');
        return;
    }

    const [a, m, d] = fechaRRaw.split('-');
    const fechaRFormateada = `${d}/${m}/${a}`;
    const filas = document.querySelectorAll('#bodyMatriz tr');
    const registrosAEnviar = [];

    filas.forEach(f => {
        const prod = f.querySelector('.m-producto').value.toUpperCase().trim();
        if (prod !== "") {
            const dateP = f.querySelector('.m-fechaP').value;
            let datePFormated = '';
            if (dateP) { const [y, mo, da] = dateP.split('-'); datePFormated = `${da}/${mo}/${y}`; }

            registrosAEnviar.push({
                "PRODUCTO": prod,
                "MEDIDA": f.querySelector('.m-medida').value.trim(),
                "LOTE": f.querySelector('.m-lote').value.trim(),
                "FECHA P.": datePFormated,
                "CANTIDAD": f.querySelector('.m-cantidad').value,
                "UM": f.querySelector('.m-um').value,
                "PESO": f.querySelector('.m-peso').value.trim(),
                "BULTO": f.querySelector('.m-bulto').value.trim(),
                "CLIENTE": cliente,
                "FECHA R.": fechaRFormateada,
                "CORRELATIVO": f.querySelector('.m-correlativo').value.trim()
            });
        }
    });

    if (registrosAEnviar.length === 0) {
        alert('No se detectaron productos escritos en las filas.');
        return;
    }

    alert('⏳ Transmitiendo paquete de datos a Google Sheets...');

    fetch(API_BASE_REGISTRO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: registrosAEnviar })
    })
        .then(res => res.json())
        .then(() => {
            alert('✅ ¡Grabación exitosa!');
            document.getElementById('masterCliente').value = '';
            document.getElementById('bodyMatriz').innerHTML = '';
            for (let i = 0; i < 5; i++) { agregarFilaMatriz(); }
        }).catch(() => alert('Error crítico al guardar la matriz.'));
}

// --- DIRECCIONAMIENTO DE DATOS A PESTAÑAS INDEPENDIENTES ---
function guardarNuevoCatalogoExcel(e) {
    e.preventDefault();
    const prod = document.getElementById('catProducto').value.toUpperCase().trim();
    const um = document.getElementById('catUM').value.toUpperCase().trim();
    const cli = document.getElementById('catCliente').value.toUpperCase().trim();

    if (!prod && !um && !cli) { alert('Escribe datos en al menos un campo.'); return; }

    const promesasEnvio = [];

    // Cada campo genera un POST directo e independiente a su respectiva pestaña
    if (prod) {
        promesasEnvio.push(fetch(API_PRODUCTO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [{ "PRODUCTO": prod }] })
        }));
    }
    if (um) {
        promesasEnvio.push(fetch(API_UM, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [{ "UM": um }] })
        }));
    }
    if (cli) {
        promesasEnvio.push(fetch(API_CLIENTES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [{ "CLIENTES": cli }] })
        }));
    }

    alert('⏳ Indexando catálogos en sus respectivas pestañas del Excel...');

    Promise.all(promesasEnvio)
        .then(() => {
            alert('⚙️ Operación Completada: Los nuevos datos fueron guardados de forma ordenada en sus propias pestañas.');
            document.getElementById('formNuevoDato').reset();
        })
        .catch(() => alert('Error al registrar datos en los catálogos.'));
}

function cargarHistorialCompleto() {
    const tbody = document.getElementById('tbodyHistorial');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">🔍 Sincronizando registros históricos desde la nube...</td></tr>';

    fetch(API_BASE_REGISTRO).then(res => res.json()).then(data => {
        tbody.innerHTML = '';
        data.forEach((fila) => {
            const tr = document.createElement('tr');
            if (String(fila.LOTE) === '1188') tr.classList.add('fila-alerta');

            tr.innerHTML = `
                <td><strong>${fila.PRODUCTO || ''}</strong></td>
                <td>${fila.MEDIDA || ''}</td>
                <td><span class="badge-lote">${fila.LOTE || ''}</span></td>
                <td>${fila['FECHA P.'] || ''}</td>
                <td>${fila.CANTIDAD || ''}</td>
                <td>${fila.UM || ''}</td>
                <td>${fila.PESO || ''}</td>
                <td>${fila.BULTO || ''}</td>
                <td>${fila.CLIENTE || ''}</td>
                <td>${fila['FECHA R.'] || ''}</td>
                <td><code>${fila.CORRELATIVO || ''}</code></td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(err => console.error("Error al cargar el historial:", err));
}

function configurarBuscadorMultivariable() {
    const input = document.getElementById('buscadorAvanzado');
    if (!input) return;
    input.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filas = document.querySelectorAll('#tbodyHistorial tr');

        filas.forEach(f => {
            if (f.cells.length < 11) return;
            const medida = f.cells[1].textContent.toLowerCase();
            const lote = f.cells[2].textContent.toLowerCase();
            const cliente = f.cells[8].textContent.toLowerCase();

            if (medida.includes(query) || lote.includes(query) || cliente.includes(query)) {
                f.style.display = '';
            } else {
                f.style.display = 'none';
            }
        });
    });
}