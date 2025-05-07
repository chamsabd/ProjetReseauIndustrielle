// Fonction pour calculer le LRC (MODBUS ASCII)
function calculateLRC(data) {
    let lrc = 0;
    for (let i = 0; i < data.length; i += 2) {
        const byte = parseInt(data.substr(i, 2), 16);
        lrc = (lrc + byte) & 0xFF;
    }
    lrc = ((~lrc + 1) & 0xFF); // Complément à 2
    return lrc.toString(16).padStart(2, '0').toUpperCase();
}


// Fonction pour valider l'entrée hexadécimale
function validateHex(input) {
    return /^[0-9a-fA-F]*$/.test(input) && input.length % 2 === 0;
}

// Fonction pour afficher une alerte d'erreur
function showError(message, tabId) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    const tabContent = document.getElementById(tabId);
    tabContent.insertBefore(alertDiv, tabContent.firstChild);
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}
// Fonction pour calculer le CRC-16 (MODBUS RTU/TCP)
function calculateCRC(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i += 2) {
        const byte = parseInt(data.substr(i, 2), 16);
        crc ^= byte;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x0001) ? (crc >> 1) ^ 0xA001 : crc >> 1;
        }
    }
    const crcLow = (crc & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    const crcHigh = ((crc >> 8) & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    return crcLow + crcHigh;
}
// Étapes de calcul du CRC
function generateCrcSteps(data) {
    let steps = '<div class="calculation-steps"><h6>Étapes du calcul CRC-16:</h6><ol>';
    let crc = 0xFFFF;
    steps += `<li>Initialisation: CRC = <span class="hex-byte">0xFFFF</span></li>`;
    for (let i = 0; i < data.length; i += 2) {
        const byteHex = data.substr(i, 2).toUpperCase();
        const byte = parseInt(byteHex, 16);
        crc ^= byte;
        steps += `<li>Après octet <span class="hex-byte">0x${byteHex}</span>: CRC = <span class="hex-byte">0x${crc.toString(16).padStart(4, '0').toUpperCase()}</span></li>`;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x0001) ? (crc >> 1) ^ 0xA001 : crc >> 1;
        }
    }
    const crcLow = (crc & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    const crcHigh = ((crc >> 8) & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    const finalCrc = ((crc & 0xFF).toString(16).padStart(2, '0') + ((crc >> 8) & 0xFF).toString(16).padStart(2, '0')).toUpperCase();
    steps += `<li>Résultat final: <span class="hex-byte">0x${crcHigh} ${crcLow}</span></li>`;
    steps += `<li>Inversion octets pour MODBUS: <span class="hex-byte">0x${crcLow} ${crcHigh}</span></li>`;
    steps += '</ol></div>';
    return steps;
}

// Calcul MODBUS ASCII
function calculateAscii() {
    document.querySelectorAll('#ascii .alert').forEach(el => el.remove());

    const address = document.getElementById('asciiAddress').value;
    const func = document.getElementById('asciiFunction').value;
    const data = document.getElementById('asciiData').value;

    if (!validateHex(address) || address.length !== 2) {
        showError("Adresse invalide. Doit être 2 caractères hexadécimaux.", 'ascii');
        return;
    }

    if (!validateHex(func) || func.length !== 2) {
        showError("Fonction invalide. Doit être 2 caractères hexadécimaux.", 'ascii');
        return;
    }

    if (data && !validateHex(data)) {
        showError("Données invalides. Doit être une chaîne hexadécimale de longueur paire.", 'ascii');
        return;
    }

    const dataBytes = data.length / 2;
    if (dataBytes > 252) {
        showError(`Trop de données (${dataBytes} octets). Maximum 252 octets.`, 'ascii');
        return;
    }

    const fullMessage = address + func + data;
    const lrc = calculateLRC(fullMessage);
    const asciiTrame = ":" + fullMessage + lrc + "\r\n";

    document.getElementById('asciiResult').textContent = asciiTrame;

    // Calcul détaillé
    const byteList = [address, func, ...(data.match(/.{2}/g) || [])];
    const byteSum = byteList.reduce((sum, b) => sum + parseInt(b, 16), 0);
    const lowByte = byteSum & 0xFF;

    let details = `
        <p><strong>Structure:</strong> ":" + message + LRC + CRLF</p>
        <p><strong>Message complet:</strong> ${byteList.join(' ')}</p>
        <div class="calculation-steps">
            <h6>Calcul du LRC:</h6>
            <ol>
                <li>Somme des octets: ${byteList.map(b => parseInt(b, 16)).join(' + ')} = ${byteSum}</li>
                <li>8 bits de poids faible: ${lowByte}</li>
                <li>Complément à 2: ${lrc}</li>
            </ol>
        </div>
        <p><strong>Taille:</strong> ${asciiTrame.length} caractères</p>
        ${dataBytes === 252 ? '<div class="alert alert-warning">Taille maximale atteinte</div>' : ''}
    `;
    document.getElementById('asciiDetails').innerHTML = details;
}

// Calcul de la trame MODBUS TCP
function calculateTcp() {
    document.querySelectorAll('#tcp .alert').forEach(el => el.remove());
    
    const transactionId = document.getElementById('tcpTransactionId').value;
    const protocolId = document.getElementById('tcpProtocolId').value;
    const unitId = document.getElementById('tcpUnitId').value;
    const func = document.getElementById('tcpFunction').value;
    const data = document.getElementById('tcpData').value;
    
    // Validation
    if (!validateHex(transactionId) || transactionId.length !== 4) {
        showError("ID de transaction invalide. Doit être 4 caractères hexadécimaux.", 'tcp');
        return;
    }
    
    if (!validateHex(protocolId) || protocolId.length !== 4) {
        showError("ID de protocole invalide. Doit être 4 caractères hexadécimaux.", 'tcp');
        return;
    }
    
    if (!validateHex(unitId) || unitId.length !== 2) {
        showError("ID d'unité invalide. Doit être 2 caractères hexadécimaux.", 'tcp');
        return;
    }
    
    if (!validateHex(func) || func.length !== 2) {
        showError("Fonction invalide. Doit être 2 caractères hexadécimaux.", 'tcp');
        return;
    }
    
    if (data && !validateHex(data)) {
        showError("Données invalides. Doit être une chaîne hexadécimale de longueur paire.", 'tcp');
        return;
    }
    
    // Vérification taille maximale
    const dataBytes = data.length / 2;
    if (dataBytes > 252) {
        showError(`Trop de données (${dataBytes} octets). Maximum 252 octets pour MODBUS TCP.`, 'tcp');
        return;
    }
    
    // Calculer la longueur (unitId + func + data)
    const length = 1 + 1 + dataBytes;
    document.getElementById('tcpLength').value = length.toString(16).padStart(4, '0').toUpperCase();
    
    const mbapHeader = transactionId + protocolId + document.getElementById('tcpLength').value + unitId;
    const pdu = func + data;
    const fullMessage = mbapHeader + pdu;
    
    // Formatage avec espace tous les 2 caractères
    const formattedTrame = fullMessage.match(/.{2}/g).join(' ');
    document.getElementById('tcpResult').textContent = formattedTrame;
    
    // Détails du calcul
    let details = `
        <p><strong>Structure de la trame:</strong> En-tête MBAP (7 octets) + PDU (${length} octets)</p>
        
        <div class="calculation-steps">
            <h6>En-tête MBAP (7 octets):</h6>
            <ul>
                <li>Transaction ID: <span class="hex-byte">0x${transactionId}</span> (${parseInt(transactionId, 16)})</li>
                <li>Protocol ID: <span class="hex-byte">0x${protocolId}</span> (toujours 0 pour MODBUS)</li>
                <li>Length: <span class="hex-byte">0x${document.getElementById('tcpLength').value}</span> (${length} octets = UnitID + Fct + Données)</li>
                <li>Unit ID: <span class="hex-byte">0x${unitId}</span> (${parseInt(unitId, 16)})</li>
            </ul>
        </div>
        
        <div class="calculation-steps">
            <h6>PDU (${1 + 1 + dataBytes} octets):</h6>
            <ul>
                <li>Function Code: <span class="hex-byte">0x${func}</span> (${parseInt(func, 16)})</li>
                <li>Data: ${data || 'Aucune donnée'}</li>
            </ul>
        </div>
        
        <p><strong>Taille totale:</strong> ${7 + length} octets (7 MBAP + ${length} PDU)</p>
        ${dataBytes === 252 ? '<div class="alert alert-warning">Taille maximale atteinte (252 octets de données)</div>' : ''}
        
        <div class="alert alert-info">
            <strong>Note:</strong> MODBUS TCP utilise généralement le contrôle d'erreur TCP, donc pas de CRC.
            La longueur dans l'en-tête MBAP ne comprend pas l'en-tête lui-même (seulement UnitID + PDU).
        </div>`;
    
    
    document.getElementById('tcpDetails').innerHTML = details;
}




// Calcul MODBUS RTU
function calculateRtu() {
    document.querySelectorAll('#rtu .alert').forEach(el => el.remove());

    const address = document.getElementById('rtuAddress').value;
    const func = document.getElementById('rtuFunction').value;
    const data = document.getElementById('rtuData').value;

    if (!validateHex(address) || address.length !== 2) {
        showError("Adresse invalide.", 'rtu');
        return;
    }

    if (!validateHex(func) || func.length !== 2) {
        showError("Fonction invalide.", 'rtu');
        return;
    }

    if (data && !validateHex(data)) {
        showError("Données invalides.", 'rtu');
        return;
    }

    const dataBytes = data.length / 2;
    if (dataBytes > 252) {
        showError(`Trop de données (${dataBytes}).`, 'rtu');
        return;
    }

    const fullMessage = address + func + data;
    const crc = calculateCRC(fullMessage);
    const formattedTrame = (fullMessage + crc).match(/.{2}/g).join(' ');

    document.getElementById('rtuResult').textContent = formattedTrame;

    const details = `
        <p><strong>Structure:</strong> Adresse + Fonction + Données + CRC</p>
        <p><strong>Message complet:</strong> ${address} ${func} ${data || 'Aucune donnée'}</p>
        ${generateCrcSteps(fullMessage)}
        <p><strong>Taille:</strong> ${1 + 1 + dataBytes + 2} octets</p>
        ${dataBytes === 252 ? '<div class="alert alert-warning">Taille maximale atteinte</div>' : ''}
    `;
    document.getElementById('rtuDetails').innerHTML = details;
}


// Initialisation
window.onload = function() {
    calculateAscii();
    calculateRtu();
    calculateTcp();
    
    // Activer les tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
};