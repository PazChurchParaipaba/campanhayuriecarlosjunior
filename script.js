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
        // Bypass auth and go to dashboard directly (Aberto)
        setSessionUser({ id: 999999, name: 'Cidadão', role: 'citizen', phone: '000000000' });
        checkAuthState();
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

    // Cidadão Submit
    document.getElementById('cidadaoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('cidName').value;
        const phone = document.getElementById('cidPhone').value;
        const err = document.getElementById('cidError');
        
        // Check if user exists
        const { data: existing } = await supabaseClient.from('users').select('*').eq('phone', phone).maybeSingle();
        
        if (existing) {
            err.textContent = '';
            setSessionUser(existing);
            checkAuthState();
        } else {
            // Create user on the fly
            const { data, error } = await supabaseClient.from('users').insert([{
                name, phone, role: 'citizen', email: `${Date.now()}@temp.com`, password: '123'
            }]).select().single();

            if (error) {
                err.textContent = 'Erro ao entrar. Tente novamente.';
                console.error(error);
                return;
            }
            err.textContent = '';
            setSessionUser(data);
            checkAuthState();
        }
    });

    // Liderança Submit
    document.getElementById('liderancaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('lidName').value;
        const phone = document.getElementById('lidPhone').value;
        const err = document.getElementById('lidError');

        if (name === 'Admin Master' && phone === '85991815434') {
            err.textContent = '';
            setSessionUser({ id: 999999, name: 'Admin Master', role: 'master', phone: '85991815434' });
            checkAuthState();
        } else {
            // Let's also check if there is an actual leader in the DB
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('name', name)
                .eq('phone', phone)
                .in('role', ['leader', 'master'])
                .maybeSingle();

            if (data) {
                err.textContent = '';
                setSessionUser(data);
                checkAuthState();
            } else {
                err.textContent = 'Credenciais de liderança inválidas.';
            }
        }
    });

    // Logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearSessionUser();
            checkAuthState();
        });
    });

    // --- CITIZEN ACTIONS ---
    document.getElementById('votoForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getSessionUser();
        const voto = {
            user_id: user.id,
            user_name: user.name,
            eleitor_nome: document.getElementById('votoNome').value,
            eleitor_telefone: document.getElementById('votoTelefone').value,
            bairro: document.getElementById('votoBairro').value,
            data: new Date().toLocaleDateString(),
            type: 'voto'
        };
        
        await supabaseClient.from('votos_fechados').insert([voto]);
        e.target.reset();
        alert('Voto Fechado registrado com sucesso!');
        loadCitizenHistory();
    });

    const createVotoForm = document.getElementById('createVotoForm');
    if (createVotoForm) {
        createVotoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = getSessionUser();
            const voto = {
                user_id: user.id,
                user_name: user.name,
                eleitor_nome: document.getElementById('votoEleitor').value,
                eleitor_telefone: document.getElementById('votoTelefone').value,
                bairro: document.getElementById('votoBairro').value,
                data: new Date().toLocaleDateString(),
                type: 'voto'
            };
            
            await supabaseClient.from('votos_fechados').insert([voto]);
            e.target.reset();
            if (typeof loadAdminData === 'function') loadAdminData();
            alert('Voto Fechado registrado com sucesso!');
        });
    }

    const matForm = document.getElementById('materialForm');
    if (matForm) {
        matForm.addEventListener('submit', async (e) => {
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
    }
    
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

    // --- GERADOR DE ARTES (CANVAS) ---
    function setupGenerator(photoInputId, candidateSelectId, btnGenerateArtId, canvasId, previewArtId, previewTextId, btnDownloadId) {
        let userPhotoDataUrl = null;

        const photoInput = document.getElementById(photoInputId);
        const candidateSelect = document.getElementById(candidateSelectId);
        const btnGenerateArt = document.getElementById(btnGenerateArtId);
        
        // Esconde o botão de gerar arte já que agora será automático
        if (btnGenerateArt) btnGenerateArt.style.display = 'none';

        const generateArt = async () => {
            if (!userPhotoDataUrl) return;

            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            const candidateOpt = candidateSelect ? candidateSelect.value : 'both';

            const img = new Image();
            img.src = userPhotoDataUrl;
            await new Promise(r => img.onload = r);

            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            const gradientHeight = 350;
            const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0, 86, 128, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 86, 128, 0.7)');
            gradient.addColorStop(1, 'rgba(0, 56, 90, 1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

            const loadImg = (src) => new Promise((resolve) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = () => resolve(null);
                i.src = src;
            });

            const logoYuri = await loadImg('%23FECHADO%20COM%20YURI%20DO%20PARED%C3%83O.png');
            const logoCarlos = await loadImg('LOGO CARLOS JUNIOR.png');
            const logoMeuDeputado = await loadImg('MEU-DEPUTADO.png');
            const logoRostoJuntos = await loadImg('ROSTO-JUNTOS.png');
            const logoTrairi = await loadImg('TRAIRI.png');

            const bottomOffset = 180;
            if (candidateOpt === 'both') {
                if(logoYuri) {
                    const aspect = logoYuri.width / logoYuri.height;
                    const w = 420; const h = w / aspect;
                    ctx.drawImage(logoYuri, 60, canvas.height - h - bottomOffset, w, h);
                }
                
                ctx.beginPath();
                ctx.moveTo(canvas.width / 2, canvas.height - bottomOffset - 170);
                ctx.lineTo(canvas.width / 2, canvas.height - bottomOffset + 30);
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 3;
                ctx.stroke();

                if(logoCarlos) {
                    const aspect = logoCarlos.width / logoCarlos.height;
                    const w = 420; const h = w / aspect;
                    const xPos = (canvas.width / 2) + 60;
                    ctx.drawImage(logoCarlos, xPos, canvas.height - h - bottomOffset, w, h);
                }

            } else if (candidateOpt === 'yuri') {
                if(logoYuri) {
                    const aspect = logoYuri.width / logoYuri.height;
                    const w = 700; const h = w / aspect;
                    ctx.drawImage(logoYuri, canvas.width/2 - w/2, canvas.height - h - bottomOffset, w, h);
                }

            } else if (candidateOpt === 'carlos') {
                if(logoCarlos) {
                    const aspect = logoCarlos.width / logoCarlos.height;
                    const w = 700; const h = w / aspect;
                    ctx.drawImage(logoCarlos, canvas.width/2 - w/2, canvas.height - h - bottomOffset, w, h);
                }
            }

            // Draw TRAIRI logo at the top
            const trairiLogoWidth = 200; // Tamanho reduzido
            
            if (logoTrairi) {
                const aspect = logoTrairi.width / logoTrairi.height;
                const w = trairiLogoWidth; const h = w / aspect;
                ctx.drawImage(logoTrairi, (canvas.width - w) / 2, 160, w, h);
            }

            const dataUrl = canvas.toDataURL('image/png');
            const previewArt = document.getElementById(previewArtId);
            if (previewArt) {
                previewArt.src = dataUrl;
                previewArt.style.opacity = '1';
                const pt = document.getElementById(previewTextId);
                if(pt) pt.textContent = "Pronto! Clique abaixo para baixar.";
            }
            
            const btnDownload = document.getElementById(btnDownloadId);
            if (btnDownload) {
                btnDownload.style.display = 'inline-flex';
                btnDownload.onclick = async () => {
                    // Tenta usar a Web Share API (resolve o problema no iPhone/iOS)
                    try {
                        const res = await fetch(dataUrl);
                        const blob = await res.blob();
                        const file = new File([blob], 'arte_campanha.png', { type: 'image/png' });
                        
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                title: 'Arte Campanha',
                                files: [file]
                            });
                            return; // Sucesso, sai da função
                        }
                    } catch (err) {
                        console.log('Web Share não suportado ou ignorado, usando fallback', err);
                    }

                    // Fallback (Padrão para Android / Desktop)
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = 'arte_campanha.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }
        };

        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const previewText = document.getElementById(previewTextId);
                    if(previewText) previewText.textContent = "Gerando arte, aguarde...";
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        userPhotoDataUrl = event.target.result;
                        generateArt();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        if (candidateSelect) {
            candidateSelect.addEventListener('change', () => {
                if (userPhotoDataUrl) generateArt();
            });
        }
    }

    // Initialize Citizen Generator
    setupGenerator('userPhotoInputCit', 'candidateSelectCit', 'btnGenerateArtCit', 'artCanvasCit', 'previewArtCit', 'previewTextCit', 'btnDownloadArtCit');
    // Initialize Admin Generator
    setupGenerator('userPhotoInput', 'candidateSelect', 'btnGenerateArt', 'artCanvas', 'previewArt', 'previewText', 'btnDownloadArt');

    // Scroll listener to hide strip
    document.querySelectorAll('.view-container').forEach(container => {
        let lastScroll = container.scrollTop;
        container.addEventListener('scroll', () => {
            const currentScroll = container.scrollTop;
            const navs = container.querySelectorAll('.landing-nav, .top-header');
            
            if (currentScroll > lastScroll && currentScroll > 50) {
                navs.forEach(nav => nav.classList.add('hide-strip'));
            } else {
                navs.forEach(nav => nav.classList.remove('hide-strip'));
            }
            lastScroll = currentScroll;
        });
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
        const citNameEl = document.getElementById('citName');
        if (citNameEl) citNameEl.textContent = user.name;
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
    if (!historyList) return;
    historyList.innerHTML = '';

    const { data: votos } = await supabaseClient.from('votos_fechados').select('*').eq('user_id', user.id);
    const { data: materials } = await supabaseClient.from('materials').select('*').eq('user_id', user.id);
    
    const all = [...(votos || []), ...(materials || [])].sort((a,b) => b.id - a.id);

    // Update Votos Stats
    const totalVotosEl = document.getElementById('totalVotos');
    const quebraVotosEl = document.getElementById('quebraVotos');
    if (totalVotosEl && votos) {
        const total = votos.length;
        const quebra = Math.floor(total * 0.3);
        totalVotosEl.textContent = total;
        quebraVotosEl.textContent = quebra;
    }

    if (all.length === 0) {
        historyList.innerHTML = '<p style="color: white;">Nenhuma atividade registrada ainda.</p>';
        return;
    }

    all.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const title = item.type === 'voto' ? `Voto Fechado: ${item.eleitor_nome}` : `Material: ${item.tipo} (x${item.qtd})`;
        const desc = item.type === 'voto' ? `Bairro: ${item.bairro} | Tel: ${item.eleitor_telefone}` : `Entregar em: ${item.endereco}`;
        
        div.innerHTML = `
            <div class="history-info">
                <strong>${title}</strong>
                <span>${item.data} - ${desc}</span>
            </div>
            <div class="status-badge">Registrado</div>
        `;
        historyList.appendChild(div);
    });
}

let demandsChartInstance = null;

async function loadAdminData() {
    const user = getSessionUser();
    
    const [
        { data: users },
        { data: votos },
        { data: materials },
        { data: events },
        { data: internalMeetings }
    ] = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('votos_fechados').select('*').order('id', { ascending: false }),
        supabaseClient.from('materials').select('*').order('id', { ascending: false }),
        supabaseClient.from('events').select('*').order('id', { ascending: false }),
        supabaseClient.from('internal_meetings').select('*').order('id', { ascending: false })
    ]);
    
    // Update KPIs
    document.getElementById('kpiUsers').textContent = users?.length || 0;
    document.getElementById('kpiVotos').textContent = votos?.length || 0;
    document.getElementById('kpiMaterials').textContent = materials?.length || 0;
    
    // Votos Stats Admin
    const adminTotalVotosEl = document.getElementById('adminTotalVotos');
    const adminQuebraVotosEl = document.getElementById('adminQuebraVotos');
    if (adminTotalVotosEl && votos) {
        const total = votos.length;
        const quebra = Math.floor(total * 0.3);
        adminTotalVotosEl.textContent = total;
        adminQuebraVotosEl.textContent = quebra;
    }
    
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

    // Load Votos Table
    const vBody = document.getElementById('votosTbody');
    if(vBody && votos) {
        vBody.innerHTML = '';
        votos.forEach(v => {
            vBody.innerHTML += `<tr>
                <td>${v.user_name}</td>
                <td>${v.eleitor_nome}</td>
                <td>${v.eleitor_telefone}</td>
                <td>${v.bairro}</td>
                <td>${v.data}</td>
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
        const allActivity = [...(votos || []), ...(materials || [])].sort((a,b) => b.id - a.id).slice(0, 5);
        allActivity.forEach(item => {
            actList.innerHTML += `
                <div style="border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 12px;">
                    <strong style="font-size: 0.9rem; color: white;">${item.user_name}</strong>
                    <p style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px;">${item.type === 'voto' ? `Registrou voto fechado em ${item.bairro}` : `Pediu ${item.tipo}`}</p>
                </div>
            `;
        });
    }

    // Render Chart
    const ctx = document.getElementById('votosChart')?.getContext('2d');
    if (ctx && votos) {
        if (demandsChartInstance) demandsChartInstance.destroy();
        
        // Count votes per neighborhood
        const bairroCounts = {};
        votos.forEach(v => {
            const b = v.bairro || 'Desconhecido';
            bairroCounts[b] = (bairroCounts[b] || 0) + 1;
        });
        
        const labels = Object.keys(bairroCounts);
        const data = Object.values(bairroCounts);

        demandsChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ef4444', '#14b8a6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                color: 'white',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, color: 'white' } } },
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
