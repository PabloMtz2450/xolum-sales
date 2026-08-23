import { notFound } from "next/navigation";
import { prisma } from "../../server/db/prisma";

export const dynamic = "force-dynamic";

export default async function DemoDataPage() {
  if (process.env.XOLUM_DEMO_MODE !== "true" || process.env.NODE_ENV === "production") notFound();
  const [organizations, users, customers, products, opportunities, orders, preparations] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { memberships: { include: { organization: true } } }, orderBy: { email: "asc" } }),
    prisma.customer.findMany({ include: { addresses: true }, orderBy: { code: "asc" } }),
    prisma.product.findMany({ include: { stocks: true }, orderBy: { sku: "asc" } }),
    prisma.opportunity.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } }),
    prisma.salesOrder.findMany({ include: { customer: true, lines: true }, orderBy: { createdAt: "desc" } }),
    prisma.invoicePreparation.findMany({ include: { concepts: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const card = { background: "#fff", border: "1px solid #ddd8cf", borderRadius: 18, padding: 20 } as const;
  return <main style={{ minHeight: "100vh", background: "#f2efe8", color: "#171716", padding: 32, fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <p style={{ color: "#f26a4b", fontWeight: 800, letterSpacing: 1 }}>XOLUM SALES · INSPECTOR LOCAL</p>
      <h1>Datos ficticios cargados</h1>
      <p>Esta vista sólo existe con <code>XOLUM_DEMO_MODE=true</code> y nunca se habilita en producción.</p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, margin: "24px 0" }}>
        {[["Empresas", organizations.length],["Usuarios", users.length],["Clientes", customers.length],["Productos", products.length],["Oportunidades", opportunities.length],["Pedidos", orders.length],["Preparaciones CFDI", preparations.length]].map(([label,value]) => <article key={label} style={card}><small>{label}</small><div style={{ fontSize: 30, fontWeight: 800 }}>{value}</div></article>)}
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
        <article style={card}><h2>Usuarios de prueba</h2>{users.map(user => <p key={user.id}><b>{user.email}</b><br/><small>{user.memberships.map(item => `${item.role} · ${item.organization.name}`).join(" | ")}</small></p>)}</article>
        <article style={card}><h2>Clientes</h2>{customers.map(customer => <p key={customer.id}><b>{customer.code} · {customer.tradeName}</b><br/><small>{customer.rfc} · {customer.status} · {customer.addresses.length} dirección(es)</small></p>)}</article>
        <article style={card}><h2>Inventario</h2>{products.map(product => <p key={product.id}><b>{product.sku}</b> · {product.name}<br/><small>Existencia: {product.stocks.reduce((sum, stock) => sum + Number(stock.onHand), 0)} · Reservado: {product.stocks.reduce((sum, stock) => sum + Number(stock.reserved), 0)}</small></p>)}</article>
        <article style={card}><h2>Pedidos</h2>{orders.map(order => <p key={order.id}><b>{order.number}</b> · {order.customer.tradeName}<br/><small>{order.status} · ${Number(order.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })} · {order.lines.length} partida(s)</small></p>)}</article>
      </section>
    </div>
  </main>;
}
