FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN chown -R node:node /usr/src/app
USER node
RUN npm install --production --silent
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "start"]
