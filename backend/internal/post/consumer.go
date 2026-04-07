package post

import (
	"context"
	"fmt"
	"log"

	"github.com/segmentio/kafka-go"
)

func StartNotifyConsumer(kafkaAddr string) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{kafkaAddr},
		Topic:   "post-events",
		GroupID: "notification-group", // Группа важна, чтобы Kafka знала, кто уже прочитал сообщение
	})

	fmt.Println("✅ Kafka Consumer started and waiting for messages...")

	for {
		// ReadMessage блокирует выполнение, пока не придет новое сообщение
		msg, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Printf("❌ Consumer error: %v", err)
			continue
		}

		// Имитируем логику другого сервиса
		fmt.Printf("🔔 [NOTIFICATION SERVICE]: Отправляю уведомление! Текст из Kafka: %s\n", string(msg.Value))
	}
}
