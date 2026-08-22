"use client";

import {
  ArrowUpRight,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { label: "Inicio", icon: LayoutDashboard },
  { label: "Clientes", icon: Building2, count: "248" },
  { label: "CRM", icon: TrendingUp, count: "32" },
  { label: "Pedidos", icon: ShoppingCart, count: "18" },
  { label: "Catálogo", icon: Boxes },
  { label: "Inventario", icon: PackageCheck },
  { label: "Logística", icon: Truck, tag: "TMS" },
];

const orders = [
  { id: "XS-1048", client: "Grupo Horizonte", amount: "$128,450", status: "Por validar", tone: "amber" },
  { id: "XS-1047", client: "Norte Distribución", amount: "$84,120", status: "Confirmado", tone: "blue" },
  { id: "XS-1046", client: "Oficinas Prisma", amount: "$42,680", status: "En preparación", tone: "violet" },
  { id: "XS-1045", client: "Comercial del Centro", amount: "$31,940", status: "Entregado", tone: "green" },
];

const stages = [
  { name: "Prospectos", value: "$840 mil", count: 12, color: "#d9f45b" },
  { name: "Cotización", value: "$1.28 M", count: 8, color: "#f2b84b" },
  { name: "Negociación", value: "$760 mil", count: 5, color: "#f26a4b" },
  { name: "Por aprobar", value: "$492 mil", count: 3, color: "#3347f5" },
];

export default function Home() {
  const [active, setActive] = useState("Inicio");
  const [sidebar, setSidebar] = useState(false);

  return (
    <main className="shell">
      <aside className={sidebar ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brandMark">X</div>
          <div><strong>XOLUM</strong><span>Sales</span></div>
        </div>
        <p className="eyebrow">ESPACIO DE TRABAJO</p>
        <button className="company">XOLUM México <ChevronDown size={15} /></button>
        <nav>
          {nav.map(({ label, icon: Icon, count, tag }) => (
            <button key={label} className={active === label ? "navItem active" : "navItem"} onClick={() => { setActive(label); setSidebar(false); }}>
              <Icon size={18} /><span>{label}</span>
              {count && <small>{count}</small>}{tag && <em>{tag}</em>}
            </button>
          ))}
        </nav>
        <div className="sideBottom">
          <button className="navItem"><Users size={18} /><span>Equipo</span></button>
          <button className="navItem"><Settings size={18} /><span>Configuración</span></button>
          <div className="profile"><div className="avatar">JP</div><div><b>Juan Pablo</b><span>Administrador</span></div></div>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <button className="menu" onClick={() => setSidebar(!sidebar)}><Menu /></button>
          <div className="search"><Search size={18} /><input aria-label="Buscar" placeholder="Buscar cliente, pedido, RFC o SKU..." /><kbd>⌘ K</kbd></div>
          <button className="quick"><Plus size={18} /> Nueva operación</button>
        </header>

        <div className="content">
          <div className="welcome">
            <div><p className="eyebrow orange">VIERNES · OPERACIÓN EN VIVO</p><h1>Todo lo importante,<br />sin el ruido.</h1><p>Clientes, ventas e inventario conectados en un solo lugar.</p></div>
            <button className="assistant"><Sparkles size={20} /><span><b>Asistente XOLUM</b><small>3 acciones recomendadas</small></span><ArrowUpRight size={18} /></button>
          </div>

          <section className="metrics">
            <article><div className="metricIcon cobalt"><CircleDollarSign /></div><div><span>Venta del mes</span><strong>$2.84 M</strong><small className="good">↑ 12.4% contra julio</small></div></article>
            <article><div className="metricIcon orangeBg"><TrendingUp /></div><div><span>Pipeline abierto</span><strong>$3.37 M</strong><small>28 oportunidades activas</small></div></article>
            <article><div className="metricIcon acid"><ShoppingCart /></div><div><span>Pedidos por atender</span><strong>18</strong><small>5 requieren una acción</small></div></article>
            <article><div className="metricIcon ink"><PackageCheck /></div><div><span>Disponibilidad</span><strong>94.2%</strong><small className="good">↑ 2.1 puntos</small></div></article>
          </section>

          <section className="grid">
            <article className="panel pipeline">
              <div className="panelHead"><div><p className="eyebrow">PIPELINE COMERCIAL</p><h2>De oportunidad a pedido</h2></div><button>Ver CRM <ArrowUpRight size={16} /></button></div>
              <div className="stageList">
                {stages.map((stage, i) => <div className="stage" key={stage.name}><div className="stageTop"><span><i style={{background:stage.color}} />{stage.name}</span><b>{stage.count}</b></div><strong>{stage.value}</strong><div className="bar"><span style={{width:`${88-i*14}%`,background:stage.color}} /></div></div>)}
              </div>
              <div className="focus"><Sparkles size={18}/><div><b>Enfoque de hoy</b><span>3 cotizaciones llevan más de 48 horas sin respuesta.</span></div><button>Revisar</button></div>
            </article>

            <article className="panel inventory">
              <div className="panelHead"><div><p className="eyebrow">INVENTARIO</p><h2>Lo que sí puedes prometer</h2></div><button>Ver catálogo <ArrowUpRight size={16} /></button></div>
              <div className="stockHero"><div className="ring"><span>94%</span></div><div><strong>Disponibilidad real</strong><span>Físico − comprometido</span></div></div>
              <div className="stockRows">
                <p><span>Disponible</span><b>12,480 u.</b></p>
                <p><span>Comprometido</span><b>2,140 u.</b></p>
                <p><span>En tránsito</span><b>3,620 u.</b></p>
              </div>
              <div className="warning"><span>7 productos necesitan atención</span><button>Resolver</button></div>
            </article>
          </section>

          <article className="panel orders">
            <div className="panelHead"><div><p className="eyebrow">PEDIDOS RECIENTES</p><h2>Operación comercial</h2></div><div className="filters"><button>Todos</button><button>Requieren acción <span>5</span></button></div></div>
            <div className="table">
              <div className="tr th"><span>Pedido</span><span>Cliente</span><span>Importe</span><span>Estado</span><span></span></div>
              {orders.map(order => <div className="tr" key={order.id}><b>{order.id}</b><span>{order.client}</span><strong>{order.amount}</strong><span><i className={`dot ${order.tone}`}/>{order.status}</span><button aria-label={`Abrir ${order.id}`}><ArrowUpRight size={17}/></button></div>)}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
