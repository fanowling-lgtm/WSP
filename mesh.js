let nodeID;
let meshState = { nodes: [], messages: [] };
const nodeColors = {};
const nodePositions = {};
const channel = new BroadcastChannel('wsp-mesh');

// --- Generate Node ID ---
function generateNodeID(existingIDs) {
    let nodeId;
    do {
        nodeId = Math.floor(Math.random() * 0xFFFFFFF0) + 0x01000000;
    } while(existingIDs.includes(nodeId.toString(16)));
    localStorage.setItem("nodeID", nodeId.toString(16));
    return nodeId.toString(16);
}

function loadNodeID() {
    const existingIDs = meshState.nodes.map(n => n.id.replace('0x',''));
    nodeID = localStorage.getItem('nodeID');
    if(!nodeID || existingIDs.includes(nodeID)){
        nodeID = generateNodeID(existingIDs);
    }
    if(!nodeColors[nodeID]) nodeColors[nodeID] = `hsl(${Math.random()*360},70%,70%)`;
}

// --- Send Message ---
function sendMessage(from, to, text){
    const msg = {id: Date.now()+Math.random(), from, to, text};
    propagateMessage(msg);
}

// --- Propagate Message ---
function propagateMessage(msg){
    if(meshState.messages.find(m=>m.id===msg.id)) return;
    meshState.messages.push(msg);
    renderMesh(meshState);
    channel.postMessage(msg);
}

// --- Receive Message ---
channel.onmessage = e => propagateMessage(e.data);

// --- Render Mesh ---
function renderMesh(data){
    const container = document.getElementById('mesh-container');
    container.innerHTML = '<svg id="mesh-lines"></svg>';
    const svg = container.querySelector('svg');

    // Determine neighbors from messages
    const neighbors = new Set();
    data.messages.forEach(m=>{
        if(m.from!==nodeID && (m.to===nodeID || m.to==="0xFFFFFFFF")) neighbors.add(m.from);
    });

    // Ensure current node exists in meshState
    if(!meshState.nodes.find(n=>n.id===nodeID)){
        meshState.nodes.push({id: nodeID});
    }

    // Render all nodes
    meshState.nodes.forEach(n=>{
        if(!nodePositions[n.id]){
            nodePositions[n.id] = {
                x: Math.random()*(container.clientWidth-130)+10,
                y: Math.random()*(container.clientHeight-60)+10
            };
        }
        if(!nodeColors[n.id]) nodeColors[n.id] = `hsl(${Math.random()*360},70%,70%)`;

        const div = document.createElement('div');
        div.className = 'node';
        div.style.background = nodeColors[n.id];
        div.style.left = nodePositions[n.id].x + 'px';
        div.style.top = nodePositions[n.id].y + 'px';
        div.innerHTML = `<div class="node-header">${n.id}</div>
            <form class="chat-form">
                <input type="text" name="target" placeholder="Target Node ID (blank = broadcast)">
                <input type="text" name="message" placeholder="Type message">
                <button type="submit">Send</button>
            </form>
            <div class="messages"></div>`;

        const messagesDiv = div.querySelector('.messages');
        data.messages.forEach(msg=>{
            if(msg.to===n.id || msg.to==="0xFFFFFFFF" || msg.from===n.id){
                if(!nodeColors[msg.from]) nodeColors[msg.from] = `hsl(${Math.random()*360},70%,70%)`;
                const m = document.createElement('div');
                m.style.color = nodeColors[msg.from];
                m.innerText = `${msg.from}: ${msg.text}`;
                messagesDiv.appendChild(m);
            }
        });

        container.appendChild(div);

        // Chat form
        const form = div.querySelector('.chat-form');
        form.addEventListener('submit', e=>{
            e.preventDefault();
            const target = form.target.value.trim() || "0xFFFFFFFF";
            const msg = form.message.value.trim();
            if(msg) sendMessage(nodeID, target, msg);
            form.message.value = '';
        });
    });

    // Draw lines to neighbors
    neighbors.forEach(nid=>{
        const start = nodePositions[nodeID];
        const end = nodePositions[nid];
        if(start && end){
            const line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("x1", start.x + 60);
            line.setAttribute("y1", start.y + 25);
            line.setAttribute("x2", end.x + 60);
            line.setAttribute("y2", end.y + 25);
            line.setAttribute("stroke", "#555");
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);
        }
    });
}

// --- Initialize ---
(function(){
    meshState = { nodes: [{id: nodeID}], messages: [] };
    loadNodeID();
    renderMesh(meshState);
})();
