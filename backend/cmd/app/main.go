package main

import (
	"context"
	"fmt"
	"os"

	"log"
	"net/http"

	"github.com/Katyi/mini-reddit/backend/internal/ai"
	"github.com/Katyi/mini-reddit/backend/internal/chat"
	"github.com/Katyi/mini-reddit/backend/internal/comment"
	"github.com/Katyi/mini-reddit/backend/internal/commentvote"
	"github.com/Katyi/mini-reddit/backend/internal/community"
	"github.com/Katyi/mini-reddit/backend/internal/post"
	"github.com/Katyi/mini-reddit/backend/internal/user"
	"github.com/Katyi/mini-reddit/backend/internal/vote"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/rs/cors"
	"github.com/segmentio/kafka-go"
)

func test(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")

	_, err := fmt.Fprintln(w, "Test")

	if err != nil {
		fmt.Println("Error occurred while writing the HTTP response:", err)
		return
	}
	fmt.Println("I processed the HTTP request correctly")

}

func main() {
	err := godotenv.Load("../.env")
	if err != nil {
		// log.Fatal("Error loading .env file")
		_ = godotenv.Load()
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // значение по умолчанию, если в .env пусто
	}

	// connStr := "postgres://user:password@localhost:5432/minireddit?sslmode=disable"
	connStr := os.Getenv("DB_URL")
	dbpool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	// Redis
	redisAddr := os.Getenv("REDIS_URL")
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "", // по умолчанию пусто
		DB:       0,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("Redis connection failed: %v", err)
	}

	// Kafka
	kafkaAddr := os.Getenv("KAFKA_URL")
	kafkaWriter := &kafka.Writer{
		Addr:     kafka.TCP(kafkaAddr),
		Topic:    "post-events", // Название очереди
		Balancer: &kafka.LeastBytes{},
		// RequiredAcks: kafka.RequireOne,
		// Async:        false,
	}
	defer kafkaWriter.Close()

	// Для постов
	postRepo := post.NewRepository(dbpool, rdb, kafkaWriter)
	postService := post.NewService(postRepo)
	postHandler := post.NewHandler(postService)

	// Для юзеров
	userRepo := user.NewRepository(dbpool)
	userService := user.NewService(userRepo)
	userHandler := user.NewHandler(userService)

	//Для комментариев
	commentRepo := comment.NewRepository(dbpool, rdb)
	commentService := comment.NewService(commentRepo)
	commentHandler := comment.NewHandler(commentService)

	// для чата
	chatRepo := chat.NewRepository(dbpool)
	chatService := chat.NewService(chatRepo)
	aiService := ai.NewService()
	hub := chat.NewHub(chatRepo, aiService)
	go hub.Run()
	chatHandler := chat.NewHandler(chatService, hub)

	// Для лайков и дизлайков постов
	voteRepo := vote.NewRepository(dbpool, rdb)
	voteService := vote.NewService(voteRepo, hub)
	voteHandler := vote.NewHandler(voteService)

	// Для сообществ
	commRepo := community.NewRepository(dbpool)
	commService := community.NewService(commRepo)
	commHandler := community.NewHandler(commService)

	// Для лайков и дизлайков комментариев
	commVoteRepo := commentvote.NewRepository(dbpool, rdb)
	commVoteService := commentvote.NewService(commVoteRepo, hub)
	commVoteHandler := commentvote.NewHandler(commVoteService)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://212.113.120.58:5005"}, // Разрешаем и локалку для тестов, и твой серверный IP
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS", "PUT"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		// Debug:            true,
	})

	r := mux.NewRouter()

	// PATH FOR MEDIA
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads" // дефолт, если забыли про .env
	}
	// Настраиваем раздачу файлов. Теперь по ссылке http://localhost:9091/uploads/файл.jpg
	// браузер будет видеть картинки из твоей папки.
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))

	handler := c.Handler(r)

	// just for test server
	r.HandleFunc("/test", test).Methods("GET")

	// Настраиваем маршруты через роутер 'r'
	r.Handle("/posts", user.AuthMiddleware(http.HandlerFunc(postHandler.GetAllPosts))).Methods("GET")
	r.Handle("/posts/{id}", user.AuthMiddleware(http.HandlerFunc(postHandler.GetPostByID))).Methods("GET")
	r.Handle("/communities/{id}/posts", user.AuthMiddleware(http.HandlerFunc(postHandler.GetPostsByCommunity))).Methods("GET")
	r.Handle("/posts", user.AuthMiddleware(http.HandlerFunc(postHandler.CreatePost))).Methods("POST")
	r.Handle("/posts/{id}", user.AuthMiddleware(http.HandlerFunc(postHandler.UpdatePost))).Methods("PATCH")
	r.Handle("/posts/{id}", user.AuthMiddleware(http.HandlerFunc(postHandler.DeletePost))).Methods("DELETE")

	r.HandleFunc("/register", userHandler.Register).Methods("POST")
	r.HandleFunc("/login", userHandler.Login).Methods("POST")
	r.HandleFunc("/refresh", userHandler.RefreshToken).Methods("POST")
	r.HandleFunc("/users/profile/{username}", userHandler.GetProfile).Methods("GET")
	r.Handle("/users", user.AuthMiddleware(http.HandlerFunc(userHandler.GetAllUsers))).Methods("GET")

	r.Handle("/posts/{id}/comments", user.AuthMiddleware(http.HandlerFunc(commentHandler.GetCommentsByPost))).Methods("GET")
	r.Handle("/posts/{id}/comments", user.AuthMiddleware(http.HandlerFunc(commentHandler.CreateComment))).Methods("POST")
	r.Handle("/comments/{id}", user.AuthMiddleware(http.HandlerFunc(commentHandler.UpdateComment))).Methods("PATCH")
	r.Handle("/comments/{id}", user.AuthMiddleware(http.HandlerFunc(commentHandler.DeleteComment))).Methods("DELETE")

	r.Handle("/posts/{id}/vote", user.AuthMiddleware(http.HandlerFunc(voteHandler.Vote))).Methods("POST")
	r.Handle("/comments/{id}/vote", user.AuthMiddleware(http.HandlerFunc(commVoteHandler.Vote))).Methods("POST")

	r.HandleFunc("/communities", commHandler.GetAll).Methods("GET")
	r.HandleFunc("/communities/name/{name}", commHandler.GetByName).Methods("GET")
	r.HandleFunc("/communities/{id}", commHandler.GetById).Methods("GET")
	r.Handle("/communities", user.AuthMiddleware(http.HandlerFunc(commHandler.Create))).Methods("POST")
	r.Handle("/communities/{id}", user.AuthMiddleware(http.HandlerFunc(commHandler.Update))).Methods("PATCH")
	r.Handle("/communities/{id}", user.AuthMiddleware(http.HandlerFunc(commHandler.Delete))).Methods("DELETE")

	r.Handle("/ws", user.AuthMiddleware(http.HandlerFunc(chatHandler.WSHandler)))
	r.Handle("/chat/history/{userId}", user.AuthMiddleware(http.HandlerFunc(chatHandler.GetHistory)))
	r.Handle("/chat/active-users", user.AuthMiddleware(http.HandlerFunc(chatHandler.GetActiveChats))).Methods("GET")
	r.Handle("/users/avatar", user.AuthMiddleware(http.HandlerFunc(userHandler.UpdateAvatar))).Methods("PATCH")

	fmt.Printf("Server is running on :%s\n", port)

	// Запускаем слушателя Kafka в фоне
	go post.StartNotifyConsumer(kafkaAddr)

	err = http.ListenAndServe(":"+port, handler)
	if err != nil {
		fmt.Println("Error while running HTTP server:", err)
	}
}
