# Этап 1: Сборка (Builder)
FROM golang:1.26-alpine AS builder


# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY go.mod go.sum ./
RUN go mod download

# Копируем весь исходный код
COPY . .

# Собираем бинарный файл (укажи путь к твоему main.go, если он не в корне)
# Например, если main лежит в cmd/api/main.go, замени на ./cmd/app/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/app/main.go

# Этап 2: Финальный образ (максимально легкий)
FROM alpine:latest

# WORKDIR /root/
WORKDIR /app

# Копируем только скомпилированный бинарник из билдера
COPY --from=builder /app/main .
# Если у тебя есть папка с конфигами или миграциями, их тоже надо скопировать:
# COPY --from=builder /app/migrations ./migrations

# Открываем порт (тот, на котором слушает твой Go сервер)
EXPOSE 8080

# Запускаем приложение
CMD ["./main"]