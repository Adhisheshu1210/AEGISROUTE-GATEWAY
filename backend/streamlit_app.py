import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import time
import json

# ==========================================
# 1. PAGE CONFIGURATION & THEME INJECTION
# ==========================================
st.set_page_config(
    page_title="AegisRoute Enterprise - Streamlit Frontend",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Glassmorphic Dark UI Theme Injection
st.markdown("""
    <style>
    /* Global Styles */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
        color: #e4e4e7;
    }
    
    /* Main Background */
    .stApp {
        background: linear-gradient(135deg, #0b0c10 0%, #12131a 100%);
        background-attachment: fixed;
    }
    
    /* Sidebar Styling */
    [data-testid="stSidebar"] {
        background: rgba(18, 19, 26, 0.95);
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    /* Glassmorphic Cards */
    .glass-card {
        background: rgba(30, 31, 41, 0.65);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 20px;
        transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    
    .glass-card:hover {
        transform: translateY(-2px);
        border-color: rgba(59, 130, 246, 0.3);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }
    
    /* KPI Stats Card Glows */
    .kpi-card {
        background: rgba(22, 28, 45, 0.5);
        border-left: 4px solid #3b82f6;
    }
    
    .kpi-alert {
        background: rgba(45, 22, 22, 0.5);
        border-left: 4px solid #ef4444;
    }
    
    .kpi-success {
        background: rgba(22, 45, 33, 0.5);
        border-left: 4px solid #10b981;
    }
    
    /* Typography Overrides */
    h1, h2, h3, .stHeader {
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        letter-spacing: -0.025em;
        color: #ffffff;
    }
    
    .tech-mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #3b82f6;
    }
    
    /* Custom Alert Badges */
    .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: bold;
        text-transform: uppercase;
    }
    .badge-critical { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-safe { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    
    /* Animation Keyframes */
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .animated-entrance {
        animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    </style>
""", unsafe_allow_html=True)

# ==========================================
# 2. STATE INITIALIZATION & HELPER FUNCTIONS
# ==========================================
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'current_page' not in st.session_state:
    st.session_state.current_page = "Dashboard"
if 'notifications' not in st.session_state:
    st.session_state.notifications = [
        {"time": "08:34:12", "type": "ALERT", "msg": "Ohio Storm boundaries intersecting Route 'ship-002'. Delay potential: +4.2 hours."},
        {"time": "08:15:00", "type": "INFO", "msg": "BigQuery schema partitions refreshed. 1.2M rows compiled in 0.12s."},
        {"time": "07:45:33", "type": "SUCCESS", "msg": "Gemini Commander optimized detour path calculated for shipment cargo-404."}
    ]
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = [
        {"role": "assistant", "content": "Welcome to AegisRoute Command Assistant. Provide any Shipment ID to compute localized detours."}
    ]

def add_notification(ntype, message):
    current_time = time.strftime("%H:%M:%S")
    st.session_state.notifications.insert(0, {"time": current_time, "type": ntype, "msg": message})

# Simulated Database Records
@st.cache_data
def get_fleet_data():
    return pd.DataFrame([
        {"shipment_id": "ship-001", "origin": "LA Port", "destination": "Chicago Hub", "cargo_value": 4500000, "lat": 34.05, "lon": -118.24, "risk_score": 34, "progress": 82, "status": "On Track", "carrier": "MAERSK LINE", "eta_delay": 0.5},
        {"shipment_id": "ship-002", "origin": "Venlo Customs", "destination": "Berlin Hub", "cargo_value": 7800000, "lat": 51.37, "lon": 6.17, "risk_score": 88, "progress": 45, "status": "Critical", "carrier": "HAPAG-LLOYD", "eta_delay": 5.4},
        {"shipment_id": "ship-003", "origin": "Houston Hub", "destination": "New York Terminal", "cargo_value": 2100000, "lat": 29.76, "lon": -95.36, "risk_score": 12, "progress": 95, "status": "On Track", "carrier": "COSCO SHIPPING", "eta_delay": 0.0},
        {"shipment_id": "ship-004", "origin": "Rotterdam Port", "destination": "Frankfurt Gate", "cargo_value": 12500000, "lat": 51.92, "lon": 4.47, "risk_score": 62, "progress": 15, "status": "Warning", "carrier": "MAERSK LINE", "eta_delay": 2.1},
        {"shipment_id": "ship-005", "origin": "Seattle Port", "destination": "Denver Terminal", "cargo_value": 6200000, "lat": 47.60, "lon": -122.33, "risk_score": 92, "progress": 30, "status": "Critical", "carrier": "HAPAG-LLOYD", "eta_delay": 6.2}
    ])

# Lottie Animation Simulated Fallback (using beautiful CSS spinning/pulse grids)
def render_lottie_container(title, text):
    st.markdown(f"""
        <div class="glass-card flex flex-col items-center justify-center text-center py-8" style="background: rgba(30,31,41,0.4);">
            <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                <span style="position: relative; display: flex; h: 40px; w: 40px;">
                    <span style="animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 9999px; background-color: #3b82f6; opacity: 0.75;"></span>
                    <span style="position: relative; display: inline-flex; border-radius: 9999px; height: 40px; width: 40px; background-color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 18px;">⚡</span>
                </span>
            </div>
            <h4 style="margin:0; color:#fff; font-size: 13px;">{title}</h4>
            <p style="margin:5px 0 0 0; color:#71717a; font-size:11px;">{text}</p>
        </div>
    """, unsafe_allow_html=True)


# ==========================================
# 3. PAGE 1: LOGIN (Bypassed or Credentials)
# ==========================================
if not st.session_state.logged_in:
    cols = st.columns([1, 2, 1])
    with cols[1]:
        st.write("")
        st.write("")
        st.write("")
        
        # Center card styled
        st.markdown("""
            <div class="glass-card text-center animated-entrance" style="margin-top: 50px; background: rgba(18, 19, 26, 0.85); border: 1px solid rgba(59, 130, 246, 0.25);">
                <div style="font-size: 40px; margin-bottom: 10px;">🛡️</div>
                <h2 style="margin: 0; color: #fff;">AegisRoute Enterprise</h2>
                <p style="color: #71717a; font-size: 12px; margin-top: 5px; font-family: 'JetBrains Mono', monospace;">SECURE CLOUD GATEWAY</p>
            </div>
        """, unsafe_allow_html=True)
        
        login_form = st.container()
        with login_form:
            st.markdown('<div class="glass-card">', unsafe_allow_html=True)
            user_id = st.text_input("Enterprise ID / Email", value="admin@aegisroute.com")
            password = st.text_input("Password", type="password", value="••••••••••••")
            
            col1, col2 = st.columns(2)
            with col1:
                remember_me = st.checkbox("Remember ID")
            with col2:
                sso_mode = st.toggle("Simulate SSO Bypass")
                
            submit_btn = st.button("Authenticate Secure Session", use_container_width=True)
            
            if submit_btn or sso_mode:
                st.session_state.logged_in = True
                add_notification("INFO", f"Enterprise session authenticated for {user_id}.")
                st.rerun()
                
            st.markdown('</div>', unsafe_allow_html=True)
            
            st.markdown("""
                <p style="text-align: center; font-size: 10px; color: #52525b; font-family: monospace;">
                    Authorized Access Only • Protected by AES-256 Multi-Factor Encryption
                </p>
            """, unsafe_allow_html=True)
    st.stop()


# ==========================================
# 4. SIDEBAR NAVIGATION
# ==========================================
with st.sidebar:
    st.markdown("""
        <div style="padding: 10px 0; border-b: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 20px;">
            <h3 style="margin:0; font-size: 16px; color: #fff; display: flex; align-items: center; gap: 8px;">
                <span>🛡️</span> AegisRoute Portal
            </h3>
            <span class="tech-mono">STREAMLIT FE PROTO v2.5</span>
        </div>
    """, unsafe_allow_html=True)
    
    # Navigation controls
    pages = [
        "Dashboard", 
        "Fleet Map", 
        "AI Assistant", 
        "Risk Center", 
        "Analytics", 
        "Reports", 
        "Settings"
    ]
    
    selected_page = st.radio(
        "NAVIGATION MODULES",
        pages,
        label_visibility="collapsed"
    )
    st.session_state.current_page = selected_page
    
    st.write("---")
    
    # Status Indicators in Sidebar
    st.markdown("""
        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <span style="font-size:11px; color:#71717a;">GPU KERNEL</span>
                <span class="badge badge-safe">Online</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <span style="font-size:11px; color:#71717a;">GCP CLOUD RUN</span>
                <span class="badge badge-safe">Active</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; color:#71717a;">ALERTS ENGINES</span>
                <span class="badge badge-warning">2 Pending</span>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    st.write("---")
    
    # Live mini-feed in sidebar
    st.markdown('<p style="font-size:10px; font-weight:bold; color:#71717a; margin-bottom: 5px;">LIVE ALARMS STREAM</p>', unsafe_allow_html=True)
    for n in st.session_state.notifications[:2]:
        color = "#ef4444" if n['type'] == 'ALERT' else "#3b82f6"
        st.markdown(f"""
            <div style="background: rgba(255,255,255,0.01); border-left: 2px solid {color}; padding: 6px 8px; margin-bottom:6px; border-radius: 2px;">
                <div style="font-size: 9px; color:#52525b; font-family:monospace;">{n['time']} • {n['type']}</div>
                <div style="font-size: 10px; color:#d4d4d8; line-height:1.2;">{n['msg']}</div>
            </div>
        """, unsafe_allow_html=True)
        
    if st.button("Sign Out Session", use_container_width=True):
        st.session_state.logged_in = False
        st.rerun()


# ==========================================
# 5. HEADER COMPONENT WITH LIVE CLOCK
# ==========================================
st.markdown(f"""
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div>
            <h1 style="margin:0; font-size: 22px;">AegisRoute Operations Hub</h1>
            <p style="margin:3px 0 0 0; font-size:11px; color:#71717a; font-family: 'JetBrains Mono', monospace; text-transform:uppercase;">
                Active Module: {st.session_state.current_page} • Connected to Google Cloud DW
            </p>
        </div>
        <div style="display:flex; align-items:center; gap: 15px;">
            <div class="tech-mono" style="background: rgba(59, 130, 246, 0.1); padding: 5px 10px; border-radius: 4px; border: 1px solid rgba(59,130,246,0.2);">
                🟢 SYSTEM SYNCED
            </div>
            <div style="font-size:12px; color:#a1a1aa; font-family: 'JetBrains Mono', monospace;">
                UTC: {time.strftime("%H:%M:%S")}
            </div>
        </div>
    </div>
""", unsafe_allow_html=True)


# ==========================================
# PAGE CONTENT SWITCHER
# ==========================================

# ------------------------------------------
# PAGE A: DASHBOARD MODULE
# ------------------------------------------
if st.session_state.current_page == "Dashboard":
    
    # 4 glassmorphic high-fidelity KPI tiles
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown("""
            <div class="glass-card kpi-card animated-entrance">
                <span style="font-size: 10px; font-family: monospace; color: #71717a; text-transform: uppercase;">ACTIVE LOGISTICS SHIPS</span>
                <h2 style="margin:5px 0 2px 0; font-size:28px;">12 Lanes</h2>
                <p style="margin:0; color:#3b82f6; font-size:11px; font-weight:bold;">⚡ GLOBAL CARRIER ALLIANCES</p>
            </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown("""
            <div class="glass-card kpi-alert animated-entrance">
                <span style="font-size: 10px; font-family: monospace; color: #71717a; text-transform: uppercase;">HIGH RISK ASSETS EXPOSURE</span>
                <h2 style="margin:5px 0 2px 0; font-size:28px;">$54.2M</h2>
                <p style="margin:0; color:#ef4444; font-size:11px; font-weight:bold;">⚠️ 3 VESSELS AT CRITICAL OVERLAP</p>
            </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown("""
            <div class="glass-card kpi-success animated-entrance">
                <span style="font-size: 10px; font-family: monospace; color: #71717a; text-transform: uppercase;">SLA PROTECTION RATE</span>
                <h2 style="margin:5px 0 2px 0; font-size:28px;">96.4%</h2>
                <p style="margin:0; color:#10b981; font-size:11px; font-weight:bold;">🟢 ABOVE REGULATORY BENCHMARK</p>
            </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown("""
            <div class="glass-card kpi-card animated-entrance" style="border-left-color: #a855f7;">
                <span style="font-size: 10px; font-family: monospace; color: #71717a; text-transform: uppercase;">RAPIDS COMPUTE THROUGHPUT</span>
                <h2 style="margin:5px 0 2px 0; font-size:28px;">14.2M rps</h2>
                <p style="margin:0; color:#a855f7; font-size:11px; font-weight:bold;">🚀 CUDA SPEEDUP ACTIVE</p>
            </div>
        """, unsafe_allow_html=True)

    # Secondary bento layout grid
    grid_left, grid_right = st.columns([2, 1])
    
    with grid_left:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("Global Transport Path Rerouting Timeline")
        
        # Plotly timeline chart
        df_chart = get_fleet_data()
        fig_timeline = px.bar(
            df_chart, 
            x="shipment_id", 
            y="progress", 
            color="status",
            title="Real-time Route Journey Progress (%)",
            color_discrete_map={"On Track": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"},
            template="plotly_dark"
        )
        fig_timeline.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#a1a1aa')
        )
        st.plotly_chart(fig_timeline, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
    with grid_right:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("Port Congestion Breakdown")
        
        # Plotly pie chart of ports
        fig_port = go.Figure(data=[go.Pie(
            labels=['LA Port', 'Rotterdam', 'Seattle', 'Houston'], 
            values=[48, 26, 12, 14],
            hole=.4,
            marker_colors=['#3b82f6', '#10b981', '#ef4444', '#f59e0b']
        )])
        fig_port.update_layout(
            template="plotly_dark",
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=30, b=10, l=10, r=10)
        )
        st.plotly_chart(fig_port, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)


# ------------------------------------------
# PAGE B: FLEET MAP (GIS coordinate plotting)
# ------------------------------------------
elif st.session_state.current_page == "Fleet Map":
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.subheader("Live Interactive GIS Telematics Tracking")
    st.write("Visualizing real-time coordinate coordinates joined against BigQuery hazard layers.")
    
    fleet_df = get_fleet_data()
    
    # Render with Mapbox via Plotly scatter mapbox
    fig_map = px.scatter_mapbox(
        fleet_df,
        lat="lat",
        lon="lon",
        color="status",
        size="cargo_value",
        color_discrete_map={"On Track": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"},
        hover_name="shipment_id",
        hover_data=["origin", "destination", "carrier", "risk_score"],
        zoom=1.5,
        height=500
    )
    fig_map.update_layout(
        mapbox_style="carto-darkmatter",
        margin={"r":0,"t":0,"l":0,"b":0},
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(color='#a1a1aa')
    )
    st.plotly_chart(fig_map, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Grid of active fleet stats
    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### Active Vessel Tracker Grid")
        st.dataframe(fleet_df, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
    with col2:
        render_lottie_container(
            title="Lottie GIS Live Mapbox Streams",
            text="Map overlays are compiled in 1.15 seconds by Spark RAPIDS on GCP GKE GPU instances."
        )


# ------------------------------------------
# PAGE C: AI ASSISTANT (Gemini Operations Commander)
# ------------------------------------------
elif st.session_state.current_page == "AI Assistant":
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.subheader("Gemini Operations Commander Chat")
    st.write("Leverage full-stack Gemini LLM pipelines to execute zero-latency rerouting alternatives during high-risk blizzards.")
    
    # Render chat interface
    chat_container = st.container()
    with chat_container:
        for chat in st.session_state.chat_history:
            role_label = "🤖 COMMANDER" if chat['role'] == "assistant" else "👤 ADMIN"
            bg_color = "rgba(59, 130, 246, 0.08)" if chat['role'] == "assistant" else "rgba(255, 255, 255, 0.03)"
            st.markdown(f"""
                <div style="background: {bg_color}; padding:15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px;">
                    <strong style="font-family: monospace; font-size:11px; color:#3b82f6;">{role_label}</strong>
                    <p style="margin:5px 0 0 0; font-size:12px; color:#e4e4e7; line-height:1.4;">{chat['content']}</p>
                </div>
            """, unsafe_allow_html=True)
            
    # Input box
    user_query = st.text_input("Enter command or query (e.g. 'Solve blizzard reroute for ship-002')", key="chat_input")
    if st.button("Query Gemini Agent"):
        if user_query:
            st.session_state.chat_history.append({"role": "user", "content": user_query})
            
            # Simulated fast AI reasoning pipeline
            with st.spinner("Executing LLM Chain..."):
                time.sleep(1.2)
                ai_response = "XGBoost models predict that bypassing the Ohio blizzard grid reduces transit risk by 46%. Alternate route generated through Southern Corridor. Ready to push detour parameters directly to telemetry receivers."
                st.session_state.chat_history.append({"role": "assistant", "content": ai_response})
                add_notification("SUCCESS", "Gemini reroute completed for corridor.")
            st.rerun()
            
    st.markdown('</div>', unsafe_allow_html=True)


# ------------------------------------------
# PAGE D: RISK CENTER (Alert overrides)
# ------------------------------------------
elif st.session_state.current_page == "Risk Center":
    st.subheader("High-Risk Supply Chain Mitigations")
    
    fleet_df = get_fleet_data()
    critical_df = fleet_df[fleet_df['risk_score'] >= 50]
    
    col_left, col_right = st.columns([1, 2])
    
    with col_left:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### Risk Filter Adjusters")
        alert_level = st.select_slider(
            "Min Corridor Risk Score (%)",
            options=[0, 20, 40, 60, 80, 100],
            value=40
        )
        st.write(f"Filtering corridors with risk >= {alert_level}%")
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Trigger mock alert button
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### Dispatch Global Emergency Alarm")
        alert_msg = st.text_input("Enter alert payload text", value="Critical congestion at Rotterdam terminals. Bypasses active.")
        if st.button("Broadcast Warning Alert", use_container_width=True):
            add_notification("ALERT", alert_msg)
            st.success("Alert successfully broadcasted to Slack/Webhooks!")
        st.markdown('</div>', unsafe_allow_html=True)
        
    with col_right:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### Active Incidents Needing Action")
        filtered_df = fleet_df[fleet_df['risk_score'] >= alert_level]
        st.dataframe(filtered_df, use_container_width=True)
        
        # Bar graph of risk scores
        fig_risk = px.bar(
            filtered_df,
            x="shipment_id",
            y="risk_score",
            color="status",
            title="SLA Risk Scoring Breakdown",
            color_discrete_map={"On Track": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"},
            template="plotly_dark"
        )
        fig_risk.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )
        st.plotly_chart(fig_risk, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)


# ------------------------------------------
# PAGE E: ANALYTICS (Gpu performance / Looker)
# ------------------------------------------
elif st.session_state.current_page == "Analytics":
    st.subheader("Performance Throughput & BigQuery Metrics")
    
    tab_gpu, tab_carbon = st.tabs(["⚡ GPU Speedup Benchmarks", "🍃 Carbon Emission Trackers"])
    
    with tab_gpu:
        col_bar, col_explain = st.columns([2, 1])
        with col_bar:
            st.markdown('<div class="glass-card">', unsafe_allow_html=True)
            st.write("##### Ingestion Compute Time (Seconds) - CPU vs NVIDIA GPU")
            
            # Parallel speedup chart data
            speedup_df = pd.DataFrame([
                {"size": "1M Rows", "CPU Time": 162.0, "NVIDIA GPU": 0.12},
                {"size": "5M Rows", "CPU Time": 810.0, "NVIDIA GPU": 0.45},
                {"size": "10M Rows", "CPU Time": 1620.0, "NVIDIA GPU": 0.88},
                {"size": "15M Rows", "CPU Time": 2430.0, "NVIDIA GPU": 1.25},
            ])
            
            fig_speedup = px.bar(
                speedup_df,
                x="size",
                y=["CPU Time", "NVIDIA GPU"],
                barmode="group",
                title="Telemetry Compute Processing Latency (Lower is Better)",
                color_discrete_sequence=["#ef4444", "#3b82f6"],
                template="plotly_dark"
            )
            fig_speedup.update_layout(
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)'
            )
            st.plotly_chart(fig_speedup, use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
            
        with col_explain:
            st.markdown("""
                <div class="glass-card">
                    <h5>NVIDIA Spark-RAPIDS cuDF Insights</h5>
                    <p style="font-size:12px; color:#a1a1aa; line-height:1.4;">
                        Our ingestion pipeline runs on highly parallelized CUDA kernels that process 14.2M telemetry rows in under 1.15s. This allows us to join geo-coordinate weather patterns instantly and feed them to Looker dashboards.
                    </p>
                    <hr style="border-color: rgba(255,255,255,0.05); margin: 15px 0;" />
                    <span class="tech-mono">BENCHMARK RATIO: ~1,940X COMPUTE ACCELERATION</span>
                </div>
            """, unsafe_allow_html=True)
            
    with tab_carbon:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### Environmental Carbon Efficiency Tracking")
        
        # Area chart representation of excess carbon output
        carbon_df = pd.DataFrame({
            "Hour": [0, 4, 8, 12, 16, 20, 24],
            "Optimal Baseline (CO2 kg)": [120, 150, 180, 220, 190, 140, 110],
            "Wasted Burn due to Port Delay (CO2 kg)": [40, 85, 120, 165, 130, 60, 25]
        })
        
        fig_carbon = px.area(
            carbon_df,
            x="Hour",
            y=["Optimal Baseline (CO2 kg)", "Wasted Burn due to Port Delay (CO2 kg)"],
            title="Cumulative Operational Carbon (CO2) Footprints",
            color_discrete_sequence=["#10b981", "#ef4444"],
            template="plotly_dark"
        )
        fig_carbon.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )
        st.plotly_chart(fig_carbon, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)


# ------------------------------------------
# PAGE F: REPORTS (Interactive tables / export)
# ------------------------------------------
elif st.session_state.current_page == "Reports":
    st.subheader("Operational Reports & Document Generators")
    
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.write("##### Master Operational Ledger")
    st.write("Select and export filtered shipment records to CSV or Excel formats.")
    
    fleet_df = get_fleet_data()
    
    # Simple AgGrid Mock table with filters
    carrier_select = st.multiselect(
        "Filter by Carrier Alliance",
        options=["MAERSK LINE", "HAPAG-LLOYD", "COSCO SHIPPING"],
        default=["MAERSK LINE", "HAPAG-LLOYD", "COSCO SHIPPING"]
    )
    
    report_df = fleet_df[fleet_df['carrier'].isin(carrier_select)]
    st.dataframe(report_df, use_container_width=True)
    
    csv = report_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Download Operational Ledger CSV",
        data=csv,
        file_name='AegisRoute_Operations_Ledger.csv',
        mime='text/csv',
    )
    st.markdown('</div>', unsafe_allow_html=True)


# ------------------------------------------
# PAGE G: SETTINGS (Admin settings)
# ------------------------------------------
elif st.session_state.current_page == "Settings":
    st.subheader("System Configurations & Credentials")
    
    col_set1, col_set2 = st.columns(2)
    
    with col_set1:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### LLM Model Selection & API Configurations")
        st.selectbox(
            "Selected Reasoning Model",
            ["Gemini 2.5 Flash (Production)", "Gemini 2.5 Pro (Precision)", "Claude 3.5 Sonnet"]
        )
        st.text_input("Gemini API Key Proxy", value="••••••••••••••••••••", type="password")
        st.caption("🔒 Secrets are kept server-side inside GCP Cloud Run Environment variables.")
        st.markdown('</div>', unsafe_allow_html=True)
        
    with col_set2:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.write("##### Live Notification Alerts Subscriptions")
        st.checkbox("Push high-risk alerts to corporate #logistics-alarms Slack channels", value=True)
        st.checkbox("Send daily carbon-compliance summaries to Board Members", value=True)
        st.checkbox("Enable real-time SMS pager duty overrides for logistics managers", value=False)
        
        if st.button("Apply Security Configurations", use_container_width=True):
            st.success("Successfully updated platform settings configuration parameters.")
        st.markdown('</div>', unsafe_allow_html=True)

# Footer element
st.markdown("""
    <hr style="border-color: rgba(255,255,255,0.05); margin-top: 40px;" />
    <p style="text-align: center; font-size: 11px; color: #52525b; font-family: monospace;">
        AegisRoute Enterprise Platform • Running on Google Cloud GKE & Cloud Run
    </p>
""", unsafe_allow_html=True)
