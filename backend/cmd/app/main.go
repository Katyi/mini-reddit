package main

import (
	"context"
	"fmt"
	"os"

	"log"
	"net/http"

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
		log.Fatal("Error loading .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "9091" // значение по умолчанию, если в .env пусто
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

	// Для лайков и дизлайков постов
	voteRepo := vote.NewRepository(dbpool, rdb)
	voteService := vote.NewService(voteRepo)
	voteHandler := vote.NewHandler(voteService)

	// Для сообществ
	commRepo := community.NewRepository(dbpool)
	commService := community.NewService(commRepo)
	commHandler := community.NewHandler(commService)

	// Для лайков и дизлайков комментариев
	commVoteRepo := commentvote.NewRepository(dbpool, rdb)
	commVoteService := commentvote.NewService(commVoteRepo)
	commVoteHandler := commentvote.NewHandler(commVoteService)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"}, // Адрес твоего будущего фронта
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	r := mux.NewRouter()
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

	r.Handle("/posts/{id}/comments", user.AuthMiddleware(http.HandlerFunc(commentHandler.GetCommentsByPost))).Methods("GET")
	r.Handle("/posts/{id}/comments", user.AuthMiddleware(http.HandlerFunc(commentHandler.CreateComment))).Methods("POST")
	r.Handle("/comments/{id}", user.AuthMiddleware(http.HandlerFunc(commentHandler.UpdateComment))).Methods("PATCH")
	r.Handle("/comments/{id}", user.AuthMiddleware(http.HandlerFunc(commentHandler.DeleteComment))).Methods("DELETE")

	r.Handle("/posts/{id}/vote", user.AuthMiddleware(http.HandlerFunc(voteHandler.Vote))).Methods("POST")
	r.Handle("/comments/{id}/vote", user.AuthMiddleware(http.HandlerFunc(commVoteHandler.Vote))).Methods("POST")

	r.HandleFunc("/communities", commHandler.GetAll).Methods("GET")
	r.HandleFunc("/communities/name/{name}", commHandler.GetByName).Methods("GET")
	r.Handle("/communities", user.AuthMiddleware(http.HandlerFunc(commHandler.Create))).Methods("POST")
	r.Handle("/communities/{id}", user.AuthMiddleware(http.HandlerFunc(commHandler.Update))).Methods("PATCH")
	r.Handle("/communities/{id}", user.AuthMiddleware(http.HandlerFunc(commHandler.Delete))).Methods("DELETE")

	fmt.Printf("Server is running on :%s\n", port)

	// Запускаем слушателя Kafka в фоне
	go post.StartNotifyConsumer(kafkaAddr)

	err = http.ListenAndServe(":"+port, handler)
	if err != nil {
		fmt.Println("Error while running HTTP server:", err)
	}
}
