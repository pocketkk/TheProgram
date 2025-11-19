# Configuration Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
cd backend
pip install -r requirements.txt
python scripts/setup.py
uvicorn app.main:app --reload
```

## 📋 Essential Environment Variables

### Required (Must Set)

```bash
SECRET_KEY=<run: python scripts/generate_secret_key.py>
SQLITE_DB_PATH=./data/theprogram.db
```

### Recommended (For Full Features)

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Get from console.anthropic.com
GEONAMES_USERNAME=your_name    # Get from geonames.org/login
REQUIRE_PASSWORD=true
```

## 🔧 Common Configuration Scenarios

### Personal Desktop (Default)
```bash
APP_ENV=development
DEBUG=true
REQUIRE_PASSWORD=true
SQLITE_DB_PATH=./data/theprogram.db
```

### Shared Computer (Secure)
```bash
APP_ENV=production
DEBUG=false
REQUIRE_PASSWORD=true  # MUST be true
SQLITE_DB_PATH=/home/user/.local/share/theprogram/theprogram.db
```

### Trusted Device (No Password)
```bash
APP_ENV=development
DEBUG=false
REQUIRE_PASSWORD=false  # Only on private devices!
```

### Production Docker
```bash
APP_ENV=production
DEBUG=false
REQUIRE_PASSWORD=true
SECRET_KEY=<new-secure-key>
```

## 📂 File Locations

| File | Purpose | Action |
|------|---------|--------|
| `backend/.env` | Your config | Copy from `.env.example` |
| `backend/.env.example` | Template | Reference for all options |
| `backend/data/theprogram.db` | Database | Auto-created |
| `backend/CONFIGURATION_GUIDE.md` | Full docs | Read for details |
| `SETUP_QUICK_START.md` | Setup guide | Follow for first setup |

## 🛠️ Useful Commands

### Setup & Verification
```bash
# Run full setup
python scripts/setup.py

# Verify configuration
python scripts/verify_config.py

# Generate new secret key
python scripts/generate_secret_key.py
```

### Running the App
```bash
# Development (with auto-reload)
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Docker
docker-compose up -d
```

### Database Operations
```bash
# Backup database
cp backend/data/theprogram.db backup/theprogram-$(date +%Y%m%d).db

# Check database size
du -h backend/data/theprogram.db

# View database (requires sqlite3)
sqlite3 backend/data/theprogram.db ".schema"
```

## 🔐 Security Checklist

- [ ] Generated new `SECRET_KEY` (not default)
- [ ] Set `DEBUG=false` in production
- [ ] Enabled `REQUIRE_PASSWORD=true` (unless trusted device)
- [ ] Database file permissions: `chmod 600 theprogram.db`
- [ ] Config file permissions: `chmod 400 .env`
- [ ] Regular backups configured
- [ ] HTTPS enabled (production)

## 🐛 Troubleshooting (90% of issues)

**Problem:** Can't start server
```bash
# Solution: Check dependencies
pip install -r requirements.txt
```

**Problem:** Database errors
```bash
# Solution: Verify config
python scripts/verify_config.py
```

**Problem:** AI interpretations not working
```bash
# Solution: Check API key
# 1. Verify ANTHROPIC_API_KEY in .env
# 2. Test key at console.anthropic.com
# 3. Check usage limits
```

**Problem:** Import errors
```bash
# Solution: Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

## 📊 SQLite Performance Tuning

### Best Performance (Desktop)
```bash
SQLITE_JOURNAL_MODE=WAL
SQLITE_SYNCHRONOUS=NORMAL
SQLITE_CACHE_SIZE=-8000  # 8MB cache
```

### Maximum Safety (Critical Data)
```bash
SQLITE_JOURNAL_MODE=WAL
SQLITE_SYNCHRONOUS=FULL
SQLITE_CACHE_SIZE=-4000
```

### Embedded/Low Memory
```bash
SQLITE_JOURNAL_MODE=DELETE
SQLITE_SYNCHRONOUS=NORMAL
SQLITE_CACHE_SIZE=-1000  # 1MB cache
```

## 🔑 API Keys - Quick Links

- **Anthropic Claude:** https://console.anthropic.com/
  - Free tier available
  - Used for AI interpretations

- **GeoNames:** https://www.geonames.org/login
  - Free registration
  - 20,000 credits/day
  - Enable web services in account

## 📖 Documentation Index

- **Full Configuration Guide:** `backend/CONFIGURATION_GUIDE.md`
- **Setup Instructions:** `SETUP_QUICK_START.md`
- **Task Completion Report:** `backend/TASK_010_CONFIGURATION_COMPLETE.md`
- **API Documentation:** http://localhost:8000/docs (when running)

## 💡 Pro Tips

1. **Use the setup script:** `python scripts/setup.py` - it handles everything
2. **Verify before running:** `python scripts/verify_config.py`
3. **Backup regularly:** SQLite database is a single file - easy to backup
4. **Check logs:** `backend/logs/app.log` for debugging
5. **Use Docker volumes:** For easy database backup and migration

## 🆘 Getting Help

1. Check this quick reference
2. Review `CONFIGURATION_GUIDE.md` for details
3. Run `python scripts/verify_config.py` for diagnostics
4. Check API docs at `/docs` endpoint
5. Review completion report for comprehensive info

---

**Last Updated:** 2025-11-16
**Configuration Version:** 2.0 (SQLite Personal App)
