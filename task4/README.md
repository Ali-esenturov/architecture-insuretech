# Архитектура оформления ОСАГО (real-time предложения)

## 1. Ключевые требования
- Показ предложений **по мере поступления** (streaming UX)
- Таймаут на расммотрение страховой заявки: **60 секунд**
- До **2500 одновременных пользователей**
- Интеграция с несколькими страховыми компаниями (REST API)

---

## 2. Общая идея решения

- **Асинхронной обработки (event-driven)**
- **Push-модели в UI (WebSocket)**
- **Polling внешних API (внутри aggregator)**

---

## 3. osago-aggregator

### 3.1 Необходима своя БД

### Зачем:
- хранить заявки, их статусы, correlationId
- отслеживать таймаут (60 сек)
- обеспечивать retry/polling
- восстанавливаться после рестартов

---

### 3.2 Ответственность сервиса
- отправка заявок в страховые компании
- периодический polling для получения оффера
- агрегация результатов
- публикация событий

---

### 3.3 API для core-app

**Асинхронное взаимодействие**

#### Вход:
```json
Command: CreateOsagoRequest
{
  "requestId": "...",
  "userData": { ... }
}
```

#### Выход (события):
```json
OsagoOfferReceived
{
  "requestId": "...",
  "insuranceCompany": "...",
  "offer": { ... }
}
```

```json
OsagoRequestCompleted
{
  "requestId": "...",
  "status": "completed | timeout"
}
```

---

## 4. Интеграция core-app и osago-aggregator

**Брокер сообщений (Kafka)**

Потоки:
- core-app -> Kafka -> osago-aggregator (command)
- osago-aggregator -> Kafka -> core-app (events)

---

## 5. API для веб-приложения

### 5.1 Создание заявки

**REST:**

#### Запрос:
HTTP:POST /osago-requests

#### Ответ:
```json
{
  "requestId": "..."
}
```

### 5.2 Получение результатов

Для получения результатов надо использовать WebSocket

---

## 6. Средство интеграции Web -> core-app

### Почему WebSocket:
- real-time обновления
- минимальная задержка
- нет лишнего polling
- масштабируемо через pub/sub

---

## 7. Паттерны отказоустойчивости

### 7.1 Взаимодействие с страховыми API

#### Обязательно (по причине того, что внешние системы могут быть нестабильны):
- Timeout (< 60s) (для предотвращения зависших потоков/сгорания ресурсов)
- Retry (с backoff)
- Circuit Breaker (для предотвращения негативных последствий на нашу систему ввиду нестабильности одной+ внешних систем)
- Rate Limiting в osago-aggegator (для предотвращения перегрузки внешних систем/блокировок/превышения лимитов/сверх оплаты)
- Rate Limiting в core-app (защита от резких всплесков/ботов)

### 7.2 osago-aggregator -> Kafka
- Retry
- Idempotency

### 7.3 core-app -> WebSocket
- reconnect logic (на клиенте)
- backpressure handling

### 7.4 core-app -> Kafka
- Transactional Outbox

---

## 8. Масштабирование

**Все сервисы stateless (имеют несколько инстансов):**
- core-app
- osago-aggregator

### Требования:

#### Kafka:
- partitioning по requestId (для правильной обработки заявок и предотвращения дублирования)

#### WebSocket:
- shared pub/sub на уровне WebSocket handlers (Redis)

#### osago-aggregator workers:
- конкурентный polling
- распределение задач (через планирование)
- с использованием Redis (типа BullMQ)