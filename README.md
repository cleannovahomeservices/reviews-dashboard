# 📊 Reviews Dashboard

Dashboard de reseñas Google para clientes, construido con Next.js y conectado a Go High Level.

## 🚀 Instalación

```bash
npm install
```

## ⚙️ Configuración

### 1. API Key de Go High Level

Crea un archivo `.env.local` en la raíz del proyecto:

```
GHL_API_KEY=tu_api_key_aqui
```

**¿Dónde encontrar el API Key?**
- Ve a GHL > Settings > Business Profile > API Key
- O en la cuenta de agencia: Agency Settings > API Keys

### 2. Añadir clientes

Edita el archivo `lib/clients.config.ts`:

```typescript
export const clients = [
  {
    name: "Nombre del Negocio",
    slug: "url-amigable",        // → tudominio.com/url-amigable
    locationId: "abc123xyz",     // Location ID de GHL
    ownerName: "Nombre Contacto",
    category: "Tipo de negocio",
    color: "#4F8EF7",            // Color de acento
  },
];
```

**¿Dónde encontrar el Location ID?**
- En GHL, abre la sub-cuenta del cliente
- La URL será: `app.gohighlevel.com/location/ESTE_ES_EL_ID/...`

### 3. Ejecutar en local

```bash
npm run dev
```

## 🌐 Desplegar en Vercel

1. Sube el proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Añade la variable de entorno `GHL_API_KEY` en Vercel > Settings > Environment Variables
4. Deploy ✅

## 📋 Estructura de URLs

- `/` → Panel central con todos los clientes
- `/nombre-cliente` → Dashboard individual (enlace para enviar al cliente)

## 🔄 Actualización de datos

Los datos se cachean 30 minutos para no sobrecargar la API de GHL. 
Para forzar actualización, haz click en "Revalidar" en el panel de Vercel o espera el ciclo automático.
