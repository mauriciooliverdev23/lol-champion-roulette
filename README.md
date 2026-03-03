# 🎰 LoL Champion Roulette

Uma roleta web para **sortear campeões de League of Legends** entre dois jogadores, permitindo selecionar a **lane de cada jogador** e garantindo que **campeões não se repitam** até que toda a pool seja utilizada.

O projeto utiliza a **API Data Dragon da Riot Games** para obter automaticamente todos os campeões do jogo.

---

# 📸 Preview

A aplicação permite:

* Inserir o nick de dois jogadores
* Escolher a lane individual de cada jogador
* Girar a roleta
* Sortear campeões compatíveis com a lane escolhida
* Evitar repetição de campeões entre rodadas

---

# 🚀 Funcionalidades

✔ Sorteio de campeões do League of Legends
✔ Seleção de lane individual por jogador
✔ Filtro automático por tipo de campeão
✔ Sistema **"não repetir campeão"** entre rodadas
✔ Reset automático quando a pool de campeões acaba
✔ Interface simples e responsiva
✔ Integração com **Riot Data Dragon API**

---

# 🛠 Tecnologias utilizadas

* **HTML5**
* **CSS3**
* **JavaScript (Vanilla JS)**
* **Riot Data Dragon API**

API utilizada:

https://developer.riotgames.com/docs/lol#data-dragon

---

# 📂 Estrutura do projeto

```
lol-champion-roulette
│
├── index.html
├── style.css
├── app.js
└── README.md
```

---

# ⚙️ Como executar o projeto

1. Clone o repositório

```
git clone https://github.com/SEU-USUARIO/lol-champion-roulette.git
```

2. Entre na pasta do projeto

```
cd lol-champion-roulette
```

3. Abra o arquivo

```
index.html
```

em qualquer navegador.

Não é necessário instalar dependências.

---

# 🎮 Como usar

1. Digite o **nick dos jogadores**
2. Escolha a **lane para cada jogador**
3. Clique em **Girar**
4. A roleta selecionará um campeão válido para cada lane
5. Campeões não se repetem até que toda a pool seja utilizada

---

# 🧠 Lógica do projeto

A aplicação:

1. Busca a lista oficial de campeões usando **Data Dragon**
2. Filtra campeões por **tags** relacionadas às lanes
3. Mantém um **controle global de campeões já sorteados**
4. Impede repetição até que todos tenham sido usados
5. Reseta automaticamente a pool quando necessário

---

# 💡 Possíveis melhorias futuras

* Escolher **modo ARAM**
* Escolher **build aleatória**
* Sistema de **ban de campeões**
* Adicionar **mais jogadores**
* Salvar histórico de partidas
* Melhorar animação da roleta

---

# 📜 Aviso

Este projeto **não é afiliado à Riot Games**.

League of Legends e seus assets são propriedade da **Riot Games**.

---

# 👨‍💻 Autor

Projeto desenvolvido como prática de **JavaScript e integração com API externa**.

Caso queira contribuir ou sugerir melhorias, fique à vontade para abrir uma **issue** ou **pull request**.
