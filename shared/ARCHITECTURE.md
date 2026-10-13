# System Architecture

```text
             ┌──────────────────┐
             │   Web Frontend   │
             │ React + Vite     │
             └────────┬─────────┘
                      │
                      │ HTTPS
                      │
             ┌────────▼─────────┐
             │   Backend API    │
             │ Node + Express   │
             └───┬─────────┬────┘
                 │         │
          ┌──────▼───┐  ┌──▼──────────┐
          │PostgreSQL│  │ Object Store│
          └──────────┘  └─────────────┘
                 │
             ┌───▼──────────────┐
             │ Realtime Socket  │
             │ Socket.IO        │
             └───┬──────────────┘
                 │
             ┌───▼──────────────┐
             │ Mobile App       │
             │ React Native     │
             └──────────────────┘
```

## Principle

One backend. One source of truth. Multiple clients.
