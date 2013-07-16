package model

import (
    "time"
)

const DB_KIND_GAME_SERVER = "GameServer"

type GameServer struct {
    Name         string
    IP           string
    Port         int
    LatestPing   time.Time
    RegisteredAt time.Time
}
