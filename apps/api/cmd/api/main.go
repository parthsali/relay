package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/parthsali/relay/apps/api/config"
	"github.com/parthsali/relay/apps/api/db"
	"github.com/parthsali/relay/apps/api/internal/database"
	"github.com/parthsali/relay/apps/api/internal/hub"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/migrator"
	apikeysModule "github.com/parthsali/relay/apps/api/internal/modules/apikeys"
	assetsModule "github.com/parthsali/relay/apps/api/internal/modules/assets"
	authModule "github.com/parthsali/relay/apps/api/internal/modules/auth"
	automationsModule "github.com/parthsali/relay/apps/api/internal/modules/automations"
	devicesModule "github.com/parthsali/relay/apps/api/internal/modules/devices"
	queueModule "github.com/parthsali/relay/apps/api/internal/modules/queue"
	schedulesModule "github.com/parthsali/relay/apps/api/internal/modules/schedules"
	spotifyModule "github.com/parthsali/relay/apps/api/internal/modules/spotify"
	usersModule "github.com/parthsali/relay/apps/api/internal/modules/users"
	wsModule "github.com/parthsali/relay/apps/api/internal/modules/ws"
	"github.com/parthsali/relay/apps/api/internal/store"
)

func main() {
	// Load .env file if present (ignored in production where vars are injected)
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	// --- Database ---
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	// --- Migrations (embedded SQL files, tracked in schema_migrations) ---
	if err := migrator.New(pool, db.Migrations, "migrations").Run(ctx); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	// --- sqlc-generated store ---
	queries := store.New(pool)

	// --- Google OAuth config ---
	oauthConfig := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}

	// --- Wire modules ---
	userHandler := usersModule.NewHandler(usersModule.NewService(queries))
	authHandler := authModule.NewHandler(authModule.NewService(queries, cfg.JWTSecret), oauthConfig, cfg.FrontendURL)
	spotifySvc := spotifyModule.NewService(queries, cfg.SpotifyClientID, cfg.SpotifyClientSecret, cfg.SpotifyRedirectURL)
	spotifyHandler := spotifyModule.NewHandler(spotifySvc, cfg.FrontendURL)

	// --- WebSocket hub (in-memory) ---
	wsHub := hub.New()
	wsHandler := wsModule.NewHandler(wsHub, queries, cfg.JWTSecret, spotifySvc)
	devicesHandler := devicesModule.NewHandler(devicesModule.NewService(queries, wsHub))

	// --- New feature modules ---
	schedulesHandler := schedulesModule.NewHandler(schedulesModule.NewService(queries))
	queueHandler := queueModule.NewHandler(queueModule.NewService(queries))
	automationsHandler := automationsModule.NewHandler(automationsModule.NewService(queries))
	apikeysHandler := apikeysModule.NewHandler(apikeysModule.NewService(queries))
	assetsHandler := assetsModule.NewHandler(assetsModule.NewService(queries, cfg.GCSBucket))

	// --- Router ---
	r := gin.Default()

	// CORS — allow the Next.js frontend to call the API
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", cfg.FrontendURL)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "environment": cfg.Environment})
	})

	// Public: Google OAuth — no JWT required
	authGroup := r.Group("/auth")
	authHandler.RegisterRoutes(authGroup)

	// Public: Spotify OAuth callback — Spotify redirects here without a JWT
	r.Group("/spotify").GET("/callback", spotifyHandler.Callback)

	// WebSocket — no JWT middleware here; the WS handler authenticates internally
	wsHandler.RegisterRoutes(r.Group("/"))

	// All other routes require a valid JWT
	protected := r.Group("/")
	protected.Use(middleware.Auth(cfg.JWTSecret))
	{
		userHandler.RegisterRoutes(protected.Group("/users"))
		spotifyHandler.RegisterProtectedRoutes(protected.Group("/spotify"))
		devicesHandler.RegisterRoutes(protected.Group("/devices"))
		schedulesHandler.RegisterRoutes(protected.Group("/schedules"))
		queueHandler.RegisterRoutes(protected.Group("/queue"))
		automationsHandler.RegisterRoutes(protected.Group("/automations"))
		apikeysHandler.RegisterRoutes(protected.Group("/developer/keys"))
		assetsHandler.RegisterRoutes(protected.Group("/assets"))
	}

	if cfg.SpotifyClientID == "" || cfg.SpotifyClientSecret == "" {
		log.Println("WARNING: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set — Spotify integration disabled")
	}

	log.Printf("starting server on :%s [%s]", cfg.Port, cfg.Environment)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
