var suits = ["S", "H", "D", "C"];
var values = ["7", "8", "9", "10", "J", "Q", "K", "A"];
var weights = {"J": 11, "Q": 12, "K": 13, "A": 14};
var deck = new Array();
var players = new Array();
var user = null;
var trickCards = [];
var deals = 0;
var dealer = 2;

var tricks = null;
var wonTricks = 0;
var better = null;
var challenger = null;
var maxBet = 0;
var bets = {};
var currentBetter = dealer;

var socket;
var connected;
var uuid;
var clients;
var names;

var delay = ( function() {
    var timer = 0;
    return function(callback, ms) {
        clearTimeout (timer);
        timer = setTimeout(callback, ms);
    };
})();

function make_uuid()
{
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function createDeck()
{
    deck = new Array();
    for (var i = 0 ; i < values.length; i++)
    {
        for(var x = 0; x < suits.length; x++)
        {
            if (values[i] == "7" && (suits[x] == "S" || suits[x] == "C"))
                continue;
            if (values[i] == "J" || values[i] == "Q" || values[i] == "K" || values[i] == "A")
                var weight = weights[values[i]];
            else
                var weight = parseInt(values[i]);
            var card = { Value: values[i], Suit: suits[x], Weight: weight };
            deck.push(card);
        }
    }
}

function createPlayers(num)
{
    players = new Array();
    for(var i = 1; i <= num; i++)
    {
        var hand = new Array();
        var player = { Name: 'Player ' + i, ID: names[i-1], Points: 0, Hand: hand };
        players.push(player);
    }
}

function make_bet_button(name, bet, player_id)
{
    var input_bet = document.createElement('input')
    input_bet.type = 'button';
    input_bet.id = 'bet_' + name + '_' + player_id;
    input_bet.className = 'btn';
    input_bet.value = name;
    input_bet.bet = bet;
    input_bet.player = player_id;
    input_bet.onclick = () => sendButtonClick(input_bet.id);
    return input_bet
}

function make_bet_div(player_id)
{
    var div_bets = document.createElement('div');
    div_bets.className = 'bet-options';
    div_bets.id = 'bets_' + player_id;
    var input_bet_skip = make_bet_button('Pass', 0, player_id);
    var input_bet_half = make_bet_button('Half', 0.5, player_id);
    var input_bet_one = make_bet_button('One', 1, player_id);
    var input_bet_two = make_bet_button('Two', 2, player_id);
    div_bets.appendChild(input_bet_skip);
    div_bets.appendChild(input_bet_half);
    div_bets.appendChild(input_bet_one);
    div_bets.appendChild(input_bet_two);
    return div_bets;
}

function make_challenge_button(player_id, challenge_id)
{
    var input_challenge = document.createElement('input');
    input_challenge.type = 'button';
    input_challenge.id = 'challenge_' + challenge_id + '_' + player_id;
    input_challenge.className = 'btn';
    input_challenge.value = 'Challenge ' + names[challenge_id];
    input_challenge.player = player_id;
    input_challenge.challenger = challenge_id;
    input_challenge.onclick = () => sendButtonClick(input_challenge.id);
    return input_challenge;
}

function make_challenge_div(player_id)
{
    var div_challenges = document.createElement('div');
    div_challenges.className = 'challenge-options';
    div_challenges.id = 'challenges_' + player_id;
    var challenge_1 = make_challenge_button(player_id, (player_id + 1) % 3);
    var challenge_2 = make_challenge_button(player_id, (player_id + 2) % 3);
    div_challenges.appendChild(challenge_1);
    div_challenges.appendChild(challenge_2);
    return div_challenges;
}

function getPlayerLabel(i)
{
    return `${players[i].ID}<br>Score: ${players[i].Points}<br>Bet: ${i in bets ? bets[i] : ""}`;

}

function createPlayersUI()
{
    document.getElementById('players').innerHTML = '';
    for(var j = 0; j < players.length; j++)
    {
        i = (j + user + 1) % 3 // Start with other users first
        var div_player = document.createElement('div');
        div_player.id = 'player_' + i;
        div_player.className = 'player';

        var div_playerlabel = document.createElement('div');

        var div_playerinfo = document.createElement('div');
        div_playerinfo.id = 'playerinfo_' + i;
        if (clients[i] !== uuid)
            div_playerinfo.className = 'other-player-info';
        else
            div_playerinfo.className = 'player-info';

        var div_hand = document.createElement('div');
        var div_bets = make_bet_div(i);
        var div_challenge = make_challenge_div(i);
        if (clients[i] !== uuid)
            div_playerinfo.style.display = 'none'

        div_playerlabel.id = 'playerlabel_' + i;
        div_playerlabel.innerHTML = getPlayerLabel(i);
        div_hand.id = 'hand_' + i;

        div_bets.style.display = 'none'
        div_challenge.style.display = 'none'

        div_player.appendChild(div_playerlabel);
        div_playerinfo.appendChild(div_hand);
        div_playerinfo.appendChild(div_challenge);
        div_playerinfo.appendChild(div_bets);

        if (clients[i] !== uuid)
            var parent = document.getElementById('otherPlayers');
        else
            var parent = document.getElementById('players');
        parent.appendChild(div_player);
        if (clients[i] === uuid) parent.appendChild(document.createElement('br'))
        parent.appendChild(div_playerinfo);
    }
}

function createTrickUI()
{
    document.getElementById('trick').appendChild(getDummyCard());
}

function clearPlayers()
{
    for(var i = 0; i < players.length; i++)
    {
        players[i].Hand = new Array();
        var hand = document.getElementById('hand_' + i);
        hand.innerHTML = '';
        var div_bets = document.getElementById('bets_' + i);
        div_bets.childNodes.forEach((child) => child.style = "");
        var div_challenges = document.getElementById('challenges_' + i);
        div_challenges.childNodes.forEach((child) => child.style = "");
    }
}

function shuffle()
{
    // for 1000 turns
    // switch the values of two random cards
    for (var i = 0; i < 1000; i++)
    {
        var location1 = Math.floor((Math.random() * deck.length));
        var location2 = Math.floor((Math.random() * deck.length));
        var tmp = deck[location1];

        deck[location1] = deck[location2];
        deck[location2] = tmp;
    }
}

function startCandy()
{
    //document.getElementById('btnStart').value = 'Restart';
    createPlayers(3);
    createPlayersUI();
    createTrickUI();
    newRound();
}

function newRound()
{
    dealer = (dealer + 1) % 3;
    currentBetter = dealer;
    deals = 0;
    createDeck();
    shuffle();
    nextDeal();
}

function nextDeal() {
    clearPlayers();
    clearTrick();
    wonTricks = 0;
    better = challenger = null;
    maxBet = 0;
    bets = {};
    currentBetter = dealer;
    if (deals < 2)
        tricks = 4;
    else if (deals == 2)
        tricks = 2;
    else
    {
        newRound();
        return;
    }
    dealHands(tricks);
    deals += 1;
    setStatusBetting(currentBetter);
}

function dealHands(num)
{
    // alternate handing cards to each player
    // num cards each
    for(var i = 0; i < num; i++)
    {
        for (var x = 0; x < players.length; x++)
        {
            var card = deck.pop();
            players[x].Hand.push(card);
            renderCard(i, card, x);
        }
    }
}

function renderCard(name, card, player_id)
{
    var hand = document.getElementById('hand_' + player_id);
    hand.appendChild(getCardUI(name, card, player_id));
}

function getDummyCard()
{
    var el = document.createElement('div');
    el.id = 'dummy_card';
    el.className = 'card';
    el.innerHTML = `<img src='cards/RED_BACK.svg'>`;
    el.style.visibility = 'hidden';
    return el;
}

function getCardUI(name, card, player_id)
{
    var el = document.createElement('div');
    el.id = 'card_' + name + '_' + player_id
    el.className = 'card';
    el.onclick = () => sendButtonClick(el.id);
    el.card = card;
    el.player = player_id;
    el.innerHTML = `<img src='cards/${card.Value}${card.Suit}.svg'>`;
    return el;
}

function clearTrick()
{
    var trick = document.getElementById('trick');
    trick.innerHTML = '';
    trick.style.background = '';
    trickCards = [];
    createTrickUI();
}

function doneBetting()
{
    if (maxBet !== 0)
    {
        setActive(better);
        setStatusChallenging();
    }
    else
        nextDeal();
}

function doBet(id)
{
    var button = document.getElementById(id);
    if ((button.player === currentBetter) && ((button.bet > maxBet) || (button.bet === 0))){
        button.style.background = '#8cfc70';
        button.style.color = 'black';
        bets[currentBetter] = button.bet;
        if (button.bet > maxBet) {
            maxBet = button.bet;
            better = currentBetter;
            if (maxBet === 2)
            {
                doneBetting();
                return
            }
        }

        // document.getElementById('player_' + currentBetter).classList.remove('active');
        // Find next player to bet
        currentBetter = (currentBetter + 1) % 3;
        if ((currentBetter in bets) && ((bets[currentBetter] === 0) || (bets[currentBetter] === maxBet)))
        {
            currentBetter = (currentBetter + 1) % 3;
            if ((currentBetter in bets) && ((bets[currentBetter] === 0) || (bets[currentBetter] === maxBet)))
            {
                // None left to bet
                doneBetting();
                return
            }
        }
        setStatusBetting(currentBetter);
    }

}

function doChallenge(id)
{
    var button = document.getElementById(id);
    if (button.player === better) {
        button.style.background = '#8cfc70';
        button.style.color = 'black';
        challenger = button.challenger
        setStatusTrick(better);
    }
}

function playCard(id)
{
    var card = document.getElementById(id);
    if ((trickCards.length == 0) && (card.player !== better))
        return;
    else if ((trickCards.length == 1) && (card.player != challenger))
        return;
    else if (trickCards.length >= 2)
        return;

    var trick = document.getElementById('trick');
    if (trickCards.length == 0)
        trick.innerHTML = ''
    trick.appendChild(card);
    trickCards.push(card.card);
    if (trickCards.length == 2) {
        if (checkWon()){
            trick.style.background = '#8cfc70';
            wonTricks += 1;
            console.log(wonTricks);
            if (wonTricks === tricks) {
                players[better].Points += maxBet;
                setStatusWinner(better);
                delay(function(){
                    newRound();
                }, 3000);
            }
            else {
                setStatusTrick(better);
                delay(function(){
                    clearTrick();
                }, 1000);
            }
        }
        else {
            trick.style.background = '#f85656';
            players[better].Points -= 2*maxBet;
            setStatusWinner(challenger);
            delay(function(){
                newRound();
            }, 3000);
        }
    }
    else
        setStatusTrick(challenger);
}

function checkWon()
{
    return ((trickCards[0].Suit != trickCards[1].Suit) || (trickCards[0].Weight > trickCards[1].Weight))
}

// function updatePoints()
// {
//     var scores = ["Scoreboard "];
//     for (var i = 0 ; i < players.length; i++)
//     {
//         scores.push("<br>" + players[i].ID + ":" + players[i].Points);
//     }
//     document.getElementById('score').innerHTML = scores.join(" ");
// }
//
// function updatePlayerLabel()
// {
//     for (var i = 0 ; i < players.length; i++)
//     {
//         document.getElementById('playerlabel_' + i).innerHTML = `{players[i].ID}<br>Score: ${players[i]}.Points<br>Bet: ${i in bets ? bets[i] : ""}`
//     }
// }

function resetActive(){
    for (var i =0; i < players.length; i++){
        document.getElementById('player_' + i).classList.remove('active');
        document.getElementById('bets_' + i).style.display = "none";
        document.getElementById('challenges_' + i).style.display = "none";
        document.getElementById('playerlabel_' + i).innerHTML = getPlayerLabel(i);
    }
}

// function getBets(){
//     currentBets = ["Bets "]
//     for (var j = dealer; j < dealer + players.length; j++){
//         var i = (j % 3);
//         if (i in bets)
//             currentBets.push(players[i].ID + ": " + bets[i]);
//     }
//     return currentBets
// }

function setStatusConnected(names)
{
    document.getElementById('gameStatus').style.display = 'block';
    document.getElementById('status').innerHTML = 'Connected: ' + names.join(', ');
    document.getElementById("status").style.display = 'inline-block';
}

function setStatusWinner(winner)
{
    resetActive();
    document.getElementById('status').innerHTML = 'Winner: ' + players[winner].ID;
    document.getElementById("status").style.display = 'inline-block';
}

function setActive(i){
    document.getElementById('player_' + i).classList.add('active');
}

function setStatusBetting(currentBetter)
{
    resetActive();
    setActive(currentBetter)
    document.getElementById('status').innerHTML = `Start Betting:  ${players[currentBetter].ID}`;
    document.getElementById("status").style.display = 'inline-block';
    if (currentBetter === user) document.getElementById('bets_' + currentBetter).style.display = 'block'
}

function setStatusChallenging()
{
    resetActive();
    setActive(better);
    document.getElementById('status').innerHTML = `Select Challenger: ${players[better].ID}`;
    document.getElementById("status").style.display = 'inline-block';
    if (better == user) document.getElementById('challenges_' + better).style.display = 'block'
}

function setStatusTrick(currentPlayer)
{
    resetActive();
    setActive(currentPlayer);
    document.getElementById('status').innerHTML = `Play Card: ${players[currentPlayer].ID}<br>${players[better].ID} vs ${players[challenger].ID}`;
    document.getElementById("status").style.display = 'inline-block';
}

function onConnect(msg)
{
    connected += 1;
    clients.push(msg.id);
    names.push(msg.name);
    setStatusConnected(names);
    if (clients.length == 3){
        sendReady();
    }
}

function sendReady()
{
    var msg = {
        type: "ready",
        text: "Ready to play!",
        clients: clients,
        names: names,
        seed: uuid,
        date: Date.now(),
    };

    socket.send(JSON.stringify(msg));
    onReady(msg)
}

function onReady(msg)
{
    clients = msg.clients;
    names = msg.names;
    Math.seedrandom(msg.seed);
    console.log("Ready to play! Clients, Names")
    console.log(clients);
    console.log(names);
    for (var i = 0; i < clients.length; i++)
    {
        if (clients[i] === uuid)
            user = i;
    }
    var gameStart = document.getElementById("gameStart");
    gameStart.style.display = "none";
    var gameBody = document.getElementById("gameBody");
    gameBody.style.display = "block";
    startCandy();
}

function sendButtonClick(id)
{
    var msg = {
        type: "button",
        text: "Button Click!",
        button: id,
        date: Date.now(),
    }
    socket.send(JSON.stringify(msg));
    onButtonClick(msg);
}

function onButtonClick(msg)
{
    console.log(msg);
    var button = document.getElementById(msg.button);
    if (button.id === "btnStart")
        startCandy();
    else if (button.id === "btnNewRound")
        newRound();
    else if (button.id === "btnNextDeal")
        nextDeal();
    else if (button.id.startsWith('bet_'))
        doBet(button.id);
    else if (button.id.startsWith('challenge_'))
        doChallenge(button.id);
    else if (button.id.startsWith('card_'))
        playCard(button.id)
}

function start()
{
    var room = document.getElementById("room").value;
    var name = document.getElementById("name").value;
    uuid = make_uuid();
    connected = 0;
    clients = [];
    names = [];

    Math.seedrandom(room);
    var channel = Math.floor(Math.random()*10000) + 1;
    console.log("Channel " + channel);

    socket = new WebSocket("wss://connect.websocket.in/v3/" + channel + "?apiKey=JToMx67IYDvU5ulGDBW7ZXb1ECV3dCUfJ9f7T9wNBjUati3zMuiK4AcG9CAW");
    socket.onopen = function(e) {
        console.log("[open] Connection established");
        console.log("Sending to server");

        var msg = {
            type: "connect",
            text: "Connected",
            id: uuid,
            name: name,
            date: Date.now()
        };

        socket.send(JSON.stringify(msg));
        onConnect(msg)
    };

    socket.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        console.log(`[message] Data received from server: ${msg.text}`);
        switch(msg.type){
            case "connect": {
                onConnect(msg);
                break;
            }
            case "ready": {
                onReady(msg);
                break;
            }
            case "button": {
                onButtonClick(msg);
                break;
            }
            default:
        }
    };
}
window.addEventListener('load', function(){
});