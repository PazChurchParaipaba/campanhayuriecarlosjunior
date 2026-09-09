// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://groezaseypdbpgymgpvo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2V6YXNleXBkYnBneW1ncHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjkxNjYsImV4cCI6MjA4MTY0NTE2Nn0.5U5QeoGmZn_i9Y8POoUCkatBUAdSW-cjHRyfxpm_pyM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SESSION_KEY = 'campanhaSession';

function getSessionUser() {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
}
function setSessionUser(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
function clearSessionUser() {
    localStorage.removeItem(SESSION_KEY);
}

// --- LOGIC ---
document.addEventListener('DOMContentLoaded', async () => {
    checkAuthState();

    // Landing / Auth navigation
    document.getElementById('btnGoToLogin').addEventListener('click', () => {
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        document.getElementById('authView').classList.add('active');
    });

    document.getElementById('btnBackToLanding').addEventListener('click', () => {
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        document.getElementById('landingView').classList.add('active');
        renderLandingEvents();
    });

    // UI Tab switching for Auth
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            e.target.classList.add('active');
            document.getElementById(`${e.target.dataset.tab}Form`).classList.add('active');
        });
    });

    // Login Submit
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        const err = document.getElementById('loginError');
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', pass)
            .maybeSingle();
            
        if (data) {
            err.textContent = '';
            setSessionUser(data);
            checkAuthState();
        } else {
            err.textContent = 'Email ou senha incorretos.';
        }
    });

    // Register Submit
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const phone = document.getElementById('regPhone').value;
        const pass = document.getElementById('regPassword').value;
        const err = document.getElementById('regError');

        // Check if exists
        const { data: existing } = await supabaseClient.from('users').select('id').eq('email', email).maybeSingle();
        if (existing) {
            err.textContent = 'Este email já está cadastrado.';
            return;
        }

        const { data, error } = await supabaseClient.from('users').insert([{
            name, email, phone, password: pass, role: 'citizen'
        }]).select().single();

        if (error) {
            err.textContent = 'Erro ao criar conta.';
            console.error(error);
            return;
        }

        setSessionUser(data);
        err.textContent = '';
        checkAuthState();
    });

    // Logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearSessionUser();
            checkAuthState();
        });
    });

    // --- CITIZEN ACTIONS ---
    document.getElementById('demandForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getSessionUser();
        const demand = {
            user_id: user.id,
            user_name: user.name,
            bairro: document.getElementById('demandBairro').value,
            categoria: document.getElementById('demandCategoria').value,
            descricao: document.getElementById('demandDescricao').value,
            data: new Date().toLocaleDateString(),
            type: 'demanda'
        };
        
        await supabaseClient.from('demands').insert([demand]);
        e.target.reset();
        alert('Demanda enviada com sucesso!');
        loadCitizenHistory();
    });

    document.getElementById('materialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getSessionUser();
        const mat = {
            user_id: user.id,
            user_name: user.name,
            tipo: document.getElementById('matTipo').value,
            qtd: document.getElementById('matQtd').value,
            endereco: document.getElementById('matEndereco').value,
            data: new Date().toLocaleDateString(),
            type: 'material'
        };
        
        await supabaseClient.from('materials').insert([mat]);
        e.target.reset();
        alert('Pedido realizado com sucesso!');
        loadCitizenHistory();
    });
    
    const mtgForm = document.getElementById('createMeetingForm');
    if (mtgForm) {
        mtgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mtg = {
                title: document.getElementById('mtgTitle').value,
                date: document.getElementById('mtgDate').value,
                time: document.getElementById('mtgTime').value,
                location: document.getElementById('mtgLocation').value,
            };
            await supabaseClient.from('internal_meetings').insert([mtg]);
            e.target.reset();
            loadAdminData();
            alert('Reunião agendada com sucesso!');
        });
    }

    // --- ADMIN ACTIONS (EVENTS) ---
    window.editingEventId = null;

    document.getElementById('createEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (window.editingEventId) {
            await supabaseClient.from('events').update({
                title: document.getElementById('evTitle').value,
                date: document.getElementById('evDate').value,
                location: document.getElementById('evLocation').value,
                desc: document.getElementById('evDesc').value
            }).eq('id', window.editingEventId);
            
            window.editingEventId = null;
            document.querySelector('#createEventForm button[type="submit"]').innerHTML = '<i class="ph ph-plus"></i> Adicionar Evento';
            alert('Evento atualizado com sucesso!');
        } else {
            const ev = {
                title: document.getElementById('evTitle').value,
                date: document.getElementById('evDate').value,
                location: document.getElementById('evLocation').value,
                desc: document.getElementById('evDesc').value,
                status: 'active'
            };
            await supabaseClient.from('events').insert([ev]);
            alert('Evento cadastrado com sucesso!');
        }
        
        e.target.reset();
        loadAdminData(); // refresh tables
        renderLandingEvents();
    });

    // --- ADMIN NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(section => section.classList.remove('active'));
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
        
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });
    }

    // Admin Generator
    const cityInput = document.getElementById('cityInput');
    const artCityDisplay = document.getElementById('artCity');
    cityInput.addEventListener('input', (e) => {
        artCityDisplay.textContent = e.target.value || "SUA CIDADE";
    });
});

// --- ROUTING & RENDERING ---
function checkAuthState() {
    const user = getSessionUser();
    
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));

    if (!user) {
        document.getElementById('landingView').classList.add('active');
        renderLandingEvents();
    } else if (user.role === 'citizen') {
        document.getElementById('citizenView').classList.add('active');
        document.getElementById('citName').textContent = user.name;
        loadCitizenHistory();
    } else {
        document.getElementById('adminView').classList.add('active');
        document.getElementById('adminName').textContent = user.name;
        document.getElementById('adminRole').textContent = user.role.toUpperCase();
        document.getElementById('adminAvatar').textContent = user.name.charAt(0).toUpperCase();
        
        const masterOnly = document.querySelectorAll('.admin-only');
        masterOnly.forEach(el => el.style.display = user.role === 'master' ? 'flex' : 'none');

        loadAdminData();
    }
}

async function renderLandingEvents() {
    const { data: events } = await supabaseClient.from('events').select('*').order('date', { ascending: true });
    
    const grid = document.getElementById('landingEventsGrid');
    grid.innerHTML = '';
    
    if(!events || events.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 64px; background:white; border-radius:1rem; color:#64748b;"><img src="EU%20TO%20FECHADO.png" style="height: 60px; opacity:0.6; margin-bottom: 16px;"><br>Nenhum evento agendado no momento. Fique ligado!</div>';
        return;
    }
    
    events.forEach(ev => {
        const d = new Date(ev.date + 'T00:00:00'); 
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const month = months[d.getMonth()];
        
        grid.innerHTML += `
        <div class="event-card" ${ev.status === 'cancelled' ? 'style="opacity: 0.6;"' : ''}>
            <div class="event-date">
                <span class="day">${day}</span>
                <span class="month">${month}</span>
            </div>
            <div class="event-details">
                <h3>
                    ${ev.title}
                    ${ev.status === 'cancelled' ? '<span class="status-badge" style="background: var(--danger-light); color: var(--danger); margin-left: 8px;">CANCELADO</span>' : ''}
                </h3>
                <p><i class="ph ph-map-pin"></i> ${ev.location}</p>
                ${ev.desc ? `<p style="margin-top:8px; font-size:0.85rem;">${ev.desc}</p>` : ''}
            </div>
        </div>
        `;
    });
}

async function loadCitizenHistory() {
    const user = getSessionUser();
    const historyList = document.getElementById('citizenHistoryList');
    historyList.innerHTML = '';

    const { data: demands } = await supabaseClient.from('demands').select('*').eq('user_id', user.id);
    const { data: materials } = await supabaseClient.from('materials').select('*').eq('user_id', user.id);
    
    const all = [...(demands || []), ...(materials || [])].sort((a,b) => b.id - a.id);

    if (all.length === 0) {
        historyList.innerHTML = '<p style="color: #64748b;">Nenhuma atividade registrada ainda.</p>';
        return;
    }

    all.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const title = item.type === 'demanda' ? `Demanda: ${item.categoria}` : `Material: ${item.tipo} (x${item.qtd})`;
        const desc = item.type === 'demanda' ? item.descricao : `Entregar em: ${item.endereco}`;
        
        div.innerHTML = `
            <div class="history-info">
                <strong>${title}</strong>
                <span>${item.data} - ${desc}</span>
            </div>
            <div class="status-badge">Em Análise</div>
        `;
        historyList.appendChild(div);
    });
}

let demandsChartInstance = null;

async function loadAdminData() {
    const user = getSessionUser();
    
    const [
        { data: users },
        { data: demands },
        { data: materials },
        { data: events },
        { data: internalMeetings }
    ] = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('demands').select('*').order('id', { ascending: false }),
        supabaseClient.from('materials').select('*').order('id', { ascending: false }),
        supabaseClient.from('events').select('*').order('id', { ascending: false }),
        supabaseClient.from('internal_meetings').select('*').order('id', { ascending: false })
    ]);
    
    // Update KPIs
    document.getElementById('kpiUsers').textContent = users?.length || 0;
    document.getElementById('kpiDemands').textContent = demands?.length || 0;
    document.getElementById('kpiMaterials').textContent = materials?.length || 0;
    
    // Load Events Table
    const eBody = document.getElementById('eventosTbody');
    if(eBody && events) {
        eBody.innerHTML = '';
        events.forEach(ev => {
            const isCancelled = ev.status === 'cancelled';
            eBody.innerHTML += `<tr>
                <td>
                    ${ev.title}
                    ${isCancelled ? '<span style="color:var(--danger); font-size:0.8rem; font-weight:bold; margin-left:8px;">(Cancelado)</span>' : ''}
                </td>
                <td>${ev.date}</td>
                <td>${ev.location}</td>
                <td>
                    <button class="action-link" style="color:var(--primary); margin-right: 8px;" onclick="editEvent(${ev.id})">Editar</button>
                    <button class="action-link" style="color:var(--warning); margin-right: 8px;" onclick="toggleEventStatus(${ev.id})">
                        ${isCancelled ? 'Restaurar' : 'Cancelar'}
                    </button>
                    <button class="action-link" style="color:var(--danger)" onclick="deleteEvent(${ev.id})">Excluir</button>
                </td>
            </tr>`;
        });
    }

    // Load Demandas Table
    const dBody = document.getElementById('demandasTbody');
    if(dBody && demands) {
        dBody.innerHTML = '';
        demands.forEach(d => {
            dBody.innerHTML += `<tr>
                <td>${d.user_name}</td>
                <td>${d.bairro}</td>
                <td>${d.categoria}</td>
                <td>${d.descricao}</td>
                <td>${d.data}</td>
            </tr>`;
        });
    }

    // Load Reuniões Internas
    const mBody = document.getElementById('reunioesTbody');
    if (mBody && internalMeetings) {
        mBody.innerHTML = '';
        internalMeetings.forEach(mtg => {
            mBody.innerHTML += `<tr>
                <td>${mtg.title}</td>
                <td>${mtg.date} ${mtg.time}</td>
                <td>${mtg.location}</td>
                <td><button class="action-link" style="color:var(--danger)" onclick="deleteMeeting(${mtg.id})">Excluir</button></td>
            </tr>`;
        });
    }

    // Load Pedidos Table
    const pBody = document.getElementById('pedidosTbody');
    if(pBody && materials) {
        pBody.innerHTML = '';
        materials.forEach(m => {
            pBody.innerHTML += `<tr>
                <td>${m.user_name}</td>
                <td>${m.tipo}</td>
                <td>${m.qtd}</td>
                <td>${m.endereco}</td>
                <td>${m.data}</td>
            </tr>`;
        });
    }

    // Load Users Table (Master only features)
    if(user.role === 'master' && users) {
        const uBody = document.getElementById('usuariosTbody');
        if (uBody) {
            uBody.innerHTML = '';
            users.forEach(u => {
                const promoteBtn = u.role === 'citizen' ? `<button class="action-link" onclick="promoteUser(${u.id})">Promover a Liderança</button>` : `<span style="color:#10b981">Admin/Líder</span>`;
                uBody.innerHTML += `<tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                    <td>${promoteBtn}</td>
                </tr>`;
            });
        }
    }

    // Load Activity List
    const actList = document.getElementById('adminActivityList');
    if (actList) {
        actList.innerHTML = '';
        const allActivity = [...(demands || []), ...(materials || [])].sort((a,b) => b.id - a.id).slice(0, 5);
        allActivity.forEach(item => {
            actList.innerHTML += `
                <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                    <strong style="font-size: 0.9rem;">${item.user_name}</strong>
                    <p style="font-size: 0.85rem; color: #64748b;">${item.type === 'demanda' ? `Registrou demanda em ${item.bairro}` : `Pediu ${item.tipo}`}</p>
                </div>
            `;
        });
    }

    // Render Chart
    const categories = ['Infraestrutura', 'Saúde', 'Educação', 'Segurança', 'Outros'];
    const catData = categories.map(cat => (demands || []).filter(d => d.categoria === cat).length);
    
    const ctx = document.getElementById('demandsChart')?.getContext('2d');
    if (ctx) {
        if (demandsChartInstance) demandsChartInstance.destroy();
        
        demandsChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: catData,
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } },
                cutout: '70%'
            }
        });
    }
}

// Global functions for inline onclick in tables
window.promoteUser = async function(userId) {
    await supabaseClient.from('users').update({ role: 'leader' }).eq('id', userId);
    loadAdminData();
    alert(`Usuário promovido a Liderança!`);
}

window.editEvent = async function(eventId) {
    const { data: ev } = await supabaseClient.from('events').select('*').eq('id', eventId).maybeSingle();
    if(ev) {
        document.getElementById('evTitle').value = ev.title;
        document.getElementById('evDate').value = ev.date;
        document.getElementById('evLocation').value = ev.location;
        document.getElementById('evDesc').value = ev.desc || '';
        
        window.editingEventId = eventId;
        document.querySelector('#createEventForm button[type="submit"]').innerHTML = '<i class="ph ph-pencil"></i> Salvar Alterações';
        
        document.getElementById('createEventForm').scrollIntoView({ behavior: 'smooth' });
    }
}

window.toggleEventStatus = async function(eventId) {
    const { data: ev } = await supabaseClient.from('events').select('status').eq('id', eventId).maybeSingle();
    if(ev) {
        const newStatus = ev.status === 'cancelled' ? 'active' : 'cancelled';
        await supabaseClient.from('events').update({ status: newStatus }).eq('id', eventId);
        loadAdminData();
        renderLandingEvents();
    }
}

window.deleteMeeting = async function(meetingId) {
    if(confirm("Deseja realmente excluir esta reunião?")) {
        await supabaseClient.from('internal_meetings').delete().eq('id', meetingId);
        loadAdminData();
    }
}

window.deleteEvent = async function(eventId) {
    if(confirm("Deseja realmente excluir este evento?")) {
        await supabaseClient.from('events').delete().eq('id', eventId);
        loadAdminData();
        renderLandingEvents();
    }
}
