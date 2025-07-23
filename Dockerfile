FROM node:20-alpine

WORKDIR /usr/src/app

# Copia os arquivos de dependência primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copia o resto do código da sua aplicação
COPY . .

# A porta que sua API expõe
EXPOSE 3000

# O comando padrão pode ser o da API, já que o docker-compose irá sobrescrevê-lo para o worker.
CMD [ "node", "gateway/server.js" ]