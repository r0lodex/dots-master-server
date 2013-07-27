package model

import (
    "time"
)

const DB_KIND_GAME_SERVER = "GameServer"

type GameServer struct {
    Name            string
    Address         string
    Active          bool
    ProtocolVersion int
    LastActivationChange time.Time
    RegisteredAt time.Time
}
