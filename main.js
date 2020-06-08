var suits = ["S", "H", "D", "C"];
var values = ["7", "8", "9", "10", "J", "Q", "K", "A"];
var weights = {"J": 11, "Q": 12, "K": 13, "A": 14};
var deck = new Array();
var players = new Array();
var trickCards = [];
var wonTricks = 0;
var better = null;
var challenger = null;
var deals = 0;

var delay = ( function() {
    var timer = 0;
    return function(callback, ms) {
        clearTimeout (timer);
        timer = setTimeout(callback, ms);
    };
})();

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
        var player = { Name: 'Player ' + i, ID: i, Points: 0, Hand: hand };
        players.push(player);
    }
}

function createPlayersUI()
{
    document.getElementById('players').innerHTML = '';
    for(var i = 0; i < players.length; i++)
    {
        var div_player = document.createElement('div');
        var div_playerid = document.createElement('div');
        var div_hand = document.createElement('div');
        var div_points = document.createElement('div');

        div_points.className = 'points';
        div_points.id = 'points_' + i;
        div_points.innerHTML = "0";
        div_player.id = 'player_' + i;
        div_player.className = 'player';
        div_hand.id = 'hand_' + i;

        div_playerid.innerHTML = 'Player ' + players[i].ID;
        div_player.appendChild(div_playerid);
        div_player.appendChild(div_hand);
        div_player.appendChild(div_points);
        document.getElementById('players').appendChild(div_player);
    }
}

function clearPlayers()
{
    for(var i = 0; i < players.length; i++)
    {
        players[i].Hand = new Array();
        var hand = document.getElementById('hand_' + i);
        hand.innerHTML = '';
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
    document.getElementById('btnStart').value = 'Restart';
    createPlayers(3);
    createPlayersUI();
    newRound();
}

function newRound()
{
    document.getElementById('status').innerHTML = '';
    document.getElementById("status").style.display = '';
    deals = 0;
    createDeck();
    shuffle();
    nextDeal();
}

function nextDeal() {
    clearPlayers();
    clearTrick();
    wonTricks = 0;
    if (deals < 2)
        dealHands(4);
    else
        dealHands(2);
    updateDeck();
    deals += 1;
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
            renderCard(card, x);
        }
    }
}

function renderCard(card, player)
{
    var hand = document.getElementById('hand_' + player);
    hand.appendChild(getCardUI(card, player));
}

function getCardUI(card, player)
{
    var el = document.createElement('div');
    el.className = 'card';
    el.onclick = playCard;
    el.card = card;
    el.player = player;
    el.innerHTML = `<img src='cards/${card.Value}${card.Suit}.svg'>`;
    return el;
}

function clearTrick()
{
    var trick = document.getElementById('trick');
    trick.innerHTML = '';
    trick.style.background = '#f5f5f5';
    trickCards = [];
    better = challenger = null;
}


function playCard()
{
    if (trickCards.length == 0)
        better = players[this.player];
    else if (trickCards.length == 1)
        challenger = players[this.player];
    else
        return

    var trick = document.getElementById('trick');
    trick.appendChild(this);
    trickCards.push(this.card);
    if (trickCards.length == 2) {
        if (checkWon()){
            trick.style.background = '#8cfc70';
            wonTricks += 1;
            console.log(wonTricks);
            if (wonTricks === 4) {
                better.Points += 1;
                end(better);
                delay(function(){
                    newRound();
                }, 3000);
            }
            else {
                delay(function(){
                    clearTrick();
                }, 1000);
            }
        }
        else {
            trick.style.background = '#f85656';
            better.Points -= 2;
            end(challenger);
            delay(function(){
                newRound();
            }, 3000);
        }
    }
}

function checkWon()
{
    return ((trickCards[0].Suit != trickCards[1].Suit) || (trickCards[0].Weight > trickCards[1].Weight))
}

function updatePoints()
{
    for (var i = 0 ; i < players.length; i++)
    {
        document.getElementById('points_' + i).innerHTML = players[i].Points;
    }
}

function end(winner)
{
    updatePoints();
    document.getElementById('status').innerHTML = 'Winner: Player ' + winner.ID;
    document.getElementById("status").style.display = 'block';
}

function updateDeck()
{
    document.getElementById('deckcount').innerHTML = deck.length;
}

window.addEventListener('load', function(){
    createDeck();
    shuffle();
    createPlayers(1);
});