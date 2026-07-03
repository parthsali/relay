package main

import (
	"github.com/gin-gonic/gin"
	"github.com/parthsali/relay/apps/api/config"
)

func main() {
	conf, err := config.Load()
	if err != nil {
		panic(err)
	}

	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":      "ok",
			"environment": conf.Environment,
			"message":     "Relay API running smoothly",
		})
	})

	router.Run(":" + conf.Port)
}
