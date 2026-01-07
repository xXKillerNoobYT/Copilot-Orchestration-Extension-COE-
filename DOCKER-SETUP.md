# 🐳 Docker Setup Guide

**Status:** Ready to use  
**Framework:** Laravel 11 + Vue 3 + MySQL + Redis + Node.js  

---

## 🚀 Quick Start

### 1. Start Docker Containers
```bash
cd c:\Users\weird\.github\Copilot-Orchestration-Extension-COE-
docker-compose up -d
```

### 2. Wait for services to start (30 seconds)
```bash
# Check status
docker-compose ps
```

### 3. Install Composer dependencies
```bash
docker-compose exec app composer install
```

### 4. Generate app key
```bash
docker-compose exec app php artisan key:generate
```

### 5. Run migrations
```bash
docker-compose exec app php artisan migrate
```

### 6. Seed database (optional)
```bash
docker-compose exec app php artisan db:seed
```

---

## 📍 Access Your Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Laravel App** | `http://localhost:8000` | Main application |
| **Frontend Dev** | `http://localhost:5173` | Vite dev server (hot reload) |
| **MySQL** | `localhost:3306` | Database |
| **Redis** | `localhost:6379` | Cache server |

---

## 🧪 Test Authentication

### 1. Register
```
http://localhost:8000/register
Email: test@example.com
Password: TestPassword123!
```

### 2. Login
```
http://localhost:8000/login
Email: test@example.com
Password: TestPassword123!
```

### 3. Verify Email
Check database directly (email verification works but no email service in Docker setup)

---

## 📊 Container Information

**App Container:**
- PHP 8.1 with Laravel
- Port: 8000
- Command: `php artisan serve`

**Database Container:**
- MySQL 8.0
- Port: 3306
- Database: copilot_auth
- User: copilot_user / copilot_password

**Redis Container:**
- Redis 7 Alpine
- Port: 6379
- Use for: Caching

**Node Container:**
- Node 18 Alpine
- Port: 5173
- Command: `npm run dev`

---

## 🔧 Common Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
```

### Execute artisan commands
```bash
docker-compose exec app php artisan tinker
docker-compose exec app php artisan migrate:refresh
docker-compose exec app php artisan cache:clear
```

### Access MySQL
```bash
docker-compose exec db mysql -u copilot_user -p copilot_auth
# Password: copilot_password
```

### Stop containers
```bash
docker-compose down
```

### Stop and remove volumes
```bash
docker-compose down -v
```

### Rebuild containers
```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Containers not starting
```bash
# Check status
docker-compose ps

# View logs
docker-compose logs

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Database connection error
```bash
# Wait 30 seconds for MySQL to start
# Check if MySQL is ready
docker-compose exec db mysqladmin ping -h localhost
```

### Permission denied errors
```bash
# Linux/Mac only
sudo chown -R $USER:$USER ./storage ./bootstrap/cache
```

### Port already in use
Edit `docker-compose.yml` and change ports:
```yaml
ports:
  - "8001:8000"  # Change 8001 to your preferred port
```

---

## 📧 Email Configuration (Optional)

For local email testing, add to `docker-compose.yml`:

```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: copilot_auth_mailhog
  ports:
    - "1025:1025"
    - "8025:8025"
  networks:
    - copilot_network
```

Then update `.env`:
```env
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
```

Access MailHog at: `http://localhost:8025`

---

## 🚀 Production Considerations

For production, consider:
- Use `.env.production` with production values
- Set `APP_DEBUG=false`
- Use strong database passwords
- Enable HTTPS
- Use managed services (AWS RDS, ElastiCache)
- Use separate container registry

---

## 📝 File Structure

```
.
├── Dockerfile           # PHP 8.1 Laravel container
├── docker-compose.yml   # Orchestration for all services
├── .env                 # Application configuration
├── .env.example         # Example configuration
├── storage/
│   ├── docker/
│   │   └── mysql/       # MySQL data volume
│   ├── logs/            # Application logs
│   └── framework/       # Framework cache/sessions
└── ... (rest of Laravel files)
```

---

## ✅ Verification Checklist

- [ ] `docker-compose ps` shows all containers running
- [ ] `http://localhost:8000` loads Laravel page
- [ ] Migrations completed successfully
- [ ] Can register new user
- [ ] Can login with credentials

---

## 🎉 You're Ready!

Your authentication system is now running in Docker! 🐳

```bash
# One command to start everything
docker-compose up -d

# View status
docker-compose ps

# Watch logs
docker-compose logs -f app

# Test it
# Visit http://localhost:8000/register
```

---

**Happy coding! 🚀**
