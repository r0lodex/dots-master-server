package handler

import (
	"appengine"
	"appengine/urlfetch"
	"appengine/user"
	"appengine/datastore"
	"net/http"
	"encoding/json"
	"io/ioutil"
	"strconv"
	"log"
	"fmt"
	"time"
	"errors"
	"github.com/truefedex/dots-master-server/utils"
	"github.com/truefedex/dots-master-server/model"
	"github.com/truefedex/dots-master-server/base"
)

const (
	KEY_SERVER_NAME = "name"
	KEY_PROTOCOL_VERSION = "protocol-version"
	KEY_ACTIVE = "active"
	KEY_SERVER_ID = "id"

	REMOTE_GAME_SERVER_PING_PATH = "/ping"

	REMOTE_GAME_SERVER_PING_ANSWER = "pong"

	ERR_WRONG_ANSWER = "Wrong answer"
	ERR_WRONG_PROTOCOL = "Not acceptable protocol version"
	ERR_WRONG_SERVER_ID = "Wrong server id"
	ERR_FORBIDDEN_CRON_URL = "This api can be accessed only from admin accaunt"

	MAX_GAME_SERVER_COUNT = 100
)

type GameServerActivationResult struct {
	Id string
}

type GameServerQueryConnectionResult struct {
	Active bool
}

func init() {
	http.HandleFunc("/api/gamesrv/query-connection", gameSrvQueryConnectionHandler)
	http.HandleFunc("/api/gamesrv/activation", gameSrvActivationHandler)
	http.HandleFunc("/api/gamesrv/cron", gameSrvCronHandler)
	http.HandleFunc("/api/gamesrv/servers-list", gameSrvListHandler)
}

func gameSrvListHandler(response http.ResponseWriter, request *http.Request) {
	context := appengine.NewContext(request)
	query := datastore.NewQuery(model.DB_KIND_GAME_SERVER).Filter("Active =", true).Limit(MAX_GAME_SERVER_COUNT)
	response.Header().Set(utils.CONTENT_TYPE_KEY, utils.JSON_MIME_TYPE)
	fmt.Fprint(response, "[")
	first := true
    for queryIterator := query.Run(context); ; {
        var server model.GameServer
        _, err := queryIterator.Next(&server)
        if err == datastore.Done {
                break
        }
        if err != nil {
                log.Fatal(err)
        }
        bJson, err := json.Marshal(server)
		if err != nil {
			log.Fatal(err)
		}
		if first {
			first = false
			fmt.Fprint(response, string(bJson))
		} else {
			fmt.Fprint(response, ",", string(bJson))
		}		
    }
    fmt.Fprint(response, "]")
}

func gameSrvCronHandler(response http.ResponseWriter, request *http.Request) {
	context := appengine.NewContext(request)
	if !user.IsAdmin(context) {
		http.Error(response, ERR_FORBIDDEN_CRON_URL, http.StatusForbidden)
		return
	}

	query := datastore.NewQuery(model.DB_KIND_GAME_SERVER).
        Filter("Active =", true)
    for queryIterator := query.Run(context); ; {
        var server model.GameServer
        key, err := queryIterator.Next(&server)
        if err == datastore.Done {
                break
        }
        if err != nil {
                log.Fatal(err)
        }
        err = pingGameServer(context, server.Address)
        if err != nil {
        	log.Println(err)
        	server.Active = false
        	server.LastActivationChange = time.Now()
        	_, err := datastore.Put(context, key, &server)
			if err != nil {
				log.Fatal(err)
			}
        }
    }
}

func gameSrvActivationHandler(response http.ResponseWriter, request *http.Request) {
	if !(utils.CheckValue(request, KEY_SERVER_NAME, utils.Rule{Min: 3, Max: 100}) &&
		utils.CheckValue(request, KEY_PROTOCOL_VERSION, utils.Rule{Number: true, Min: 1, Max: 1000}) &&
		utils.CheckValue(request, KEY_ACTIVE, utils.Rule{Values: []string{"true", "false"}})) {
		http.Error(response, utils.GetLastValidationError().Error(), http.StatusBadRequest)
		return
	}

	protocolVersion, _ := strconv.Atoi(request.FormValue(KEY_PROTOCOL_VERSION))
	if protocolVersion < base.CURRENT_PROTOCOL_VERSION {
		http.Error(response, ERR_WRONG_PROTOCOL, http.StatusNotAcceptable)
		return
	}

	context := appengine.NewContext(request)

	err := pingGameServer(context, request.RemoteAddr)
	if err != nil {
		http.Error(response, err.Error(), http.StatusInternalServerError)
		return
	}

	gameServer := new(model.GameServer)
	key, err := datastore.DecodeKey(request.FormValue(KEY_SERVER_ID))
	if err == nil {
		err = datastore.Get(context, key, gameServer)
		if err != nil {
			log.Println("Can't find game server with id: making new one")
		}
	}
	gameServer.Name = request.FormValue(KEY_SERVER_NAME)
	gameServer.Address = request.RemoteAddr
	gameServer.Active = request.FormValue(KEY_ACTIVE) == "true"
	gameServer.ProtocolVersion = protocolVersion
	gameServer.LastActivationChange = time.Now()
	if err != nil {
		gameServer.RegisteredAt = time.Now()
		key = datastore.NewIncompleteKey(context, model.DB_KIND_GAME_SERVER, nil)
	}
	
	key, err = datastore.Put(context, key, gameServer)
	if err != nil {
		log.Fatal(err)
	}

	utils.WriteJsonResponseObject(response, GameServerActivationResult{Id: key.Encode()})
}

func gameSrvQueryConnectionHandler(response http.ResponseWriter, request *http.Request) {
	if !(utils.CheckValue(request, KEY_SERVER_ID, utils.Rule{Min: 3, Max: 1000})) {
		http.Error(response, utils.GetLastValidationError().Error(), http.StatusBadRequest)
		return
	}

	context := appengine.NewContext(request)

	gameServer := new(model.GameServer)
	key, err := datastore.DecodeKey(request.FormValue(KEY_SERVER_ID))
	if err != nil {
		http.Error(response, ERR_WRONG_SERVER_ID, http.StatusBadRequest)
		return
	}
	err = datastore.Get(context, key, gameServer)
	if err != nil {
		log.Fatal(err)
	}

	utils.WriteJsonResponseObject(response, &GameServerQueryConnectionResult{Active: gameServer.Active})
}

func pingGameServer(context appengine.Context, address string) (error){
	client := urlfetch.Client(context)
	pingAddress := "http://" + address + ":8081" + REMOTE_GAME_SERVER_PING_PATH
	log.Println(pingAddress)
	resp, err := client.Get(pingAddress)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if string(body) != REMOTE_GAME_SERVER_PING_ANSWER {
		return errors.New(ERR_WRONG_ANSWER)
	}
	return nil
}