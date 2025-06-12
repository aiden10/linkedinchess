import express from 'express';
import {chromium as playwright} from 'playwright';
import chess from 'chess';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import 'log-timestamp';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = ['http://localhost:3000', 'https://linkedinchess.vercel.app', 'https://www.linkedinchessapi.aidentenn.co'];
const corsOptions = {
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const linkedinCookies = JSON.parse(await fs.readFile('cookies.json', 'utf-8'));
var whiteTurn = true;
var updating = false;
const whitePieceTable = {
    "pawn": "♙",
    "knight": "♘",
    "bishop": "♗",
    "rook": "♖",
    "queen": "♕",
    "king": "♔"
};
const blackPieceTable = {
    "pawn": "♟",
    "knight": "♞",
    "bishop": "♝",
    "rook": "♜",
    "queen": "♛",
    "king": "♚"
};

const gameStatePath = '/home/ec2-user/linkedinchess/gameState.json';
const cookieStatusPath = '/home/ec2-user/linkedinchess/cookieStatus.json';

app.get('/', async (req, res) => {
    console.log('home page visited');
    res.send("Hello");
});

app.post('/move', async (req, res) => {
    const { move } = req.body;

    try{
        var { game, moves, turn } = await getGameState();
    }
    catch (error){
        return res.status(500).json({ message: 'Failed to get game state' });
    }

    try{
        game.move(move);
    }
    catch (err){
        return res.status(400).json({ message: 'Move not valid' });
    }

    moves.push(move);
    whiteTurn = !whiteTurn;

    if (game.isCheckMate || game.isStalemate || game.isRepetition) {
        game = chess.create();
        moves = [];
        try{
            await setGameState(moves, turn);
            console.log(`updated game state moves: ${moves} turn: ${turn}`);
        }
        catch (error){
            return res.status(500).json({ message: 'Failed to save game state' });
        }

        return res.status(200).json({ message: 'Game over... Starting new game' });
    }

    let boardString = getBoardString(game);

    try{
        var updateResult = await updateLinkedIn(boardString);
    }
    catch (err){
        console.error("LinkedIn update error:", err);
        return res.status(500).json({ message: `Failed to update LinkedIn bio\nError: ${err}` });
    }
    if (updateResult){
        try{
            await setGameState(moves, turn);
            console.log(`updated game state moves: ${moves} turn: ${turn}`);
        }
        catch (error){
            return res.status(500).json({ message: 'Failed to save game state' });
        }
        res.status(200).json({ message: 'Move successful' });
    }
});

app.get('/state', async (req, res) => {
    console.log("game state requested");
    try{
        var { game, moves, turn } = await getGameState();
    }
    catch (error){
        console.error('Error in /state route:', error);
        return res.status(500).json({ message: 'Failed to get game state', error: error.message });
    }

    res.status(200).json({ moves: getValidMoves(game), played: moves });
});

app.get('/status', async (req, res) => {
    console.log("cookie status requested");
    try{
        var status  = await getCookieStatus();
    }
    catch (error){
        console.error('Error in /status route:', error);
        return res.status(500).json({ message: 'Failed to get cookie status', error: error.message });
    }

    res.status(200).json(status);
});

async function updateLinkedIn(bioString) {
    if (updating){
        console.log("updating already in progress...");
        return false;
    }
    updating = true;
    console.log("Attempting to update LinkedIn bio");
    console.log("Updating set to true");
    const cookieStatus = await getCookieStatus();
    if (cookieStatus.status === "false"){
        throw new Error('Invalid cookies, aborting update process');
    }
    const browser = await playwright.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try{
        const textFieldId = "#gai-text-form-component-profileEditFormElement-SUMMARY-profile-ACoAAEcbI-cBUSlmz2H-PCoXMIohT9khm6LCX48-summary";
        const context = await browser.newContext();
        const page = await context.newPage();
        await context.addCookies(linkedinCookies);
        await page.goto('https://www.linkedin.com/in/aidentenn/', { timeout: 60000 });
        await page.locator("#navigation-add-edit-deeplink-edit-about").click({ timeout: 30000 });
        await page.locator(textFieldId).click({ timeout: 30000 });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.insertText(bioString);
        await page.click('text="Save"');
        await page.waitForSelector('span:text("Your About section has been updated")', { timeout: 5000 });
        console.log("successfully updated bio");
        updating = false;
        await browser.close();
        return true;
    }
    catch (error){
        console.log(`Page name: ${await page.title()}`)
        console.error(`Failed to update bio:`, error);
    }
    finally{
        await browser.close();
    }
    updating = false;
}

async function setGameState(playedMoves, turn){
    const gameState = {
        moves: playedMoves,
        turn: turn
    };
    const gameStateString = JSON.stringify(gameState);
    console.log(`Storing game state: ${gameStateString}`);
    await fs.writeFile(gameStatePath, gameStateString);
}

async function getCookieStatus(){
    try{
        await fs.access(cookieStatusPath);
    }
    catch (error){
        if (error.code === 'ENOENT'){
            console.log('Cookie status file does not exist. Creating new file');
            const newStatus = {"status": "false"};
            await fs.writeFile(gameStatePath, JSON.stringify(newStatus));
            return newStatus;
        }
    }

    try{
        const data = await fs.readFile(cookieStatusPath, 'utf8');
        const status = JSON.parse(data);
        return status;
    }
    catch (error){
        console.error('Error reading cookie status:', error);
        throw new Error(`Failed to get cookie status: ${error.message}`);
    }
}

async function getGameState(){
    try {
        await fs.access(gameStatePath);
    }
    catch (error){
        if (error.code === 'ENOENT'){
            console.log('Game state file does not exist. Creating a new game.');
            const initialState = { moves: [], turn: true };
            await fs.writeFile(gameStatePath, JSON.stringify(initialState));
            return { game: chess.create(), ...initialState };
        }
    }

    try{
        const data = await fs.readFile(gameStatePath, 'utf8');
        const gameState = JSON.parse(data);
        const game = chess.create();
        gameState.moves.forEach(priorMove => {
            game.move(priorMove);
        });
        return {
            game: game,
            moves: gameState.moves,
            turn: gameState.turn
        };
    }
    catch (error) {
        console.error('Error reading game state:', error);
        throw new Error(`Failed to get game state: ${error.message}`);
    }
}

function convertToArray(str) {
    if (!str) {
        console.error('Input string is undefined or empty');
        return [];
    }

    str = str.replace(/^"|"$/g, '').replace(/^\[|\]$/g, '');
    const objStrings = str.split('}, {').map(s => s.replace(/^{/, '').replace(/}$/, ''));

    return objStrings.map(objStr => {
      const obj = {};
      objStr.split(', ').forEach(pair => {
        let [key, ...valueParts] = pair.split(': ');
        let value = valueParts.join(': ');

        key = key.replace(/'/g, '');

        const isQuotedString = /^['"].*['"]$/.test(value.trim());

        if (isQuotedString){
          value = value.replace(/^['"]|['"]$/g, '');
        } 
        else{
          if (value === 'True' || value === 'true') {
            value = true;
          } 
          else if (value === 'False' || value === 'false'){
            value = false;
          }
          else if (!isNaN(value) && value !== ''){
            value = Number(value);
          }
        }

        obj[key] = value;
      });
      return obj;
    });
}

function boardToGrid(board){
    var boardArray = Array(8).fill().map((_, i) =>
        Array(8).fill().map((_, j) => (i + j) % 2 === 0 ? '⬛' : '⬜')
    );

    board.forEach(square => {
        if (square["piece"] != null){ // don't care about empty squares
            let side = square["piece"]["side"]["name"];
            let pieceType = square["piece"]["type"];
            let x = square["rank"] - 1;
            let y = square["file"].charCodeAt(0) - 97;
            if (side === "white"){
                var icon = whitePieceTable[pieceType];
            }
            else if (side === "black"){
                var icon = blackPieceTable[pieceType];
            }
            boardArray[x][y] = icon;
        }
    });
    return boardArray;
}

function boardToString(boardArray){
    let turn = whiteTurn ? "White to move": "Black to move";
    var boardString = `
This is a chess game that you can play by going to linkedinchess.vercel.app
Note that the formatting may look strange depending on the device you are using.
Turn: ${turn}
`;
    var rowIndex = 1;
    boardArray.forEach(row => {
        boardString += row.join(" ") + " " + rowIndex + "\n";
        rowIndex++;
    });
    boardString += "A B C D E F G H"
    return boardString;
}

function getBoardString(game){
    let status = game.getStatus();
    let board = status["board"]["squares"];
    let grid = boardToGrid(board);
    return boardToString(grid);
}

function getValidMoves(game){
    // returns list of string with all valid moves
    let status = game.getStatus();
    let validMoves = status.notatedMoves;
    var moveList = [];
    for (var key of Object.keys(validMoves)){
        moveList.push(key);
    }
    return moveList;
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});