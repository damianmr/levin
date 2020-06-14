# Levin Discord Bot

Levin es un bot que permite establecer un sistema de niveles para los usuarios utilizando roles de Discord. Los usuarios suben o bajan de nivel en base a su actividad. Los niveles determinan a que canales pueden acceder estos usuarios.

## Prerrequisitos

### Creación del bot en Discord

Antes de comenzar a utilizar este proyecto, es necesario crear una nueva aplicacion en Discord, y agregarle a un bot a la misma. Esto se hace desde https://discordapp.com/developers/applications

![Crear una app en Discord](docs/app-create.gif?raw=true "Creando una app en Discord")

Al finalizar la creación de la aplicación, aparecerá un `CLIENT_ID`, con el cual podremos unir el bot a cualquier Discord en el que se lo quiera instalar.

Luego es necesario agregar un bot en esta aplicación. Necesitaremos copiar y guardar, de manera segura, el token del bot. Este token es importantísimo, pues permite al bot conectarse a Discord.

![Crear un bot en Discord](docs/bot-create.gif?raw=true "Creando un bot en Discord")

Nunca se debe subir el token a ningún archivo del repositorio y además debe permanecer secreto.

### Persistencia de la base de datos

Levin utiliza una base de datos key-value super básica que se persiste en JSON. Por limitaciones de hardware y costos, la persistencia de esta base de datos se realiza a un archivo en git utilizando el [API oficial de GitHub con Octokit](https://octokit.github.io/rest.js/v17#usage). Por lo tanto, para utilizar esta API necesitaremos dos cosas:
- un repositorio nuevo y, en lo posible, dedicado a este fin exclusivamente, pero no es necesario. Dicho repositorio, debe contener tres archivos: `dev-db.json`, `stage-db.json`, `prod-db.json`. Se puede obtener un ejemplo de estos archivos en [dev-db.json](docs/dev-db.json.example?raw=true).

![Ejemplo de repositorio](docs/repoConfig.png?raw=true "Ejemplo de repositorio")


2. un token de usuario que tenga acceso a dicho repositorio: esto se hace desde la interfaz configuracion del usuario. Este token no se debe compartir EN ABSOLUTO, ni subir al repositorio y debe tratarse con la seguridad que se trata cualquier otra contraseña.

![Creación de token de usuario](docs/userToken.gif?raw=true "Creación de token de usuario")

## Instalación
Solo se necesita instalar `nodejs` (https://nodejs.org/en/), luego:
```
npm install
```

## Configuración de la sala de Discord
Antes que intentar ejecutar el bot, es necesario unirlo a la sala de Discord donde funcionará. Para esto, se debe pedir a un administrador que acepte la solicitud del bot para ingresar. Por lo tanto, es necesario que el bot que creamos sea "Público", de otra manera, nadie podrá unirlo a su sala de Discord (los bots privados solo los puede unir su creador y solamente a aquellas salas de las que sea dueño).

![Estableciendo el bot como Público](docs/public-bot.jpg?raw=true "Estableciendo el bot como Público")

Luego se debe compartir este link con el administrador de la sala en la cual queremos que el bot se una:

```
https://discordapp.com/oauth2/authorize?&client_id=CLIENT_ID_HERE&scope=bot&permissions=268438528
```

El `CLIENT_ID` fue generado durante la creación de la app ([ver Prerrequisitos](#prerrequisitos)). El número utilizado en el parametro `permissions` corresponde a los permisos que el bot necesita para funcionar correctamente.

La lista de permisos está disponible en la página de administración del bot:

![Permisos en Discord](docs/permissions.png?raw=true "Permisos en Discord")

### Roles
En la Configuración de la sala, es necesario asegurarse de que el bot tenga la mayor autoridad posible en materia de roles. **Y sobre todo, es importante que el bot este por encima de los roles que pretende asignar.**

Por ejemplo, esta configuración no funcionará, dado que `[Test Levin App]` no va a poder remover o asignar los roles NVL1, NVL2, NVL3.

![Mala configuración de roles](docs/wrong-setup.jpg?raw=true "Mala configuración de roles")

Es necesario que la configuración luzca similar a esto:

![Configuración correcta de roles](docs/correct-setup.jpg?raw=true "Configuración correcta de roles")

### Permisos de lectura
Además, es indispensable que el bot tenga acceso de lectura a la mayor cantidad de canales posibles. No es necesario que tenga acceso en todos, pero la subida de nivel automatica se hace sobre la base de los mensajes que el bot pueda leer de los usuarios. Si un usuario es muy activo sólo en un canal determinado y el bot no puede leer los mensajes allí, eventualmente el bot bajará de nivel a este miembro.

Algo así deberia lucir la configuración de cualquier canal al que se quiera el Levin tenga accesso:
![Configuración correcta de un canal](docs/exampleChannel.png?raw=true "Configuración correcta de un canal")

### Canal donde publicar los leveleos
Se debe crear un canal donde Levin pueda publicar las actualizaciones de nivel de los usuarios. Levin utilizará este canal para avisar a quienes tengan acceso de lectura a dicho canal sobre los cambios de nivel que va realizando.

![Configuración correcta de canal de leveleos](docs/updatesChannel.png?raw=true "Configuración correcta de canal de leveleos")


## Iniciando el bot

```
LEVIN_TOKEN=<bot-token> DB_BACKUP_INTERVAL_IN_MINUTES=2 DB_REPOSITORY=<db_repository> ENV=<dev/prod/stage> GITHUB_TOKEN=<githubToken> UPDATES_CHANNEL=<nombre-de-algun-canal> npm start
```

Si todo está correctamente instalado, aparecerá un mensaje indicando que Levin se conectó a Discord.

## Flags de configuración
* `LEVIN_TOKEN=<bot-token>`: Es el token generado durante la creación del bot, sin el mismo es imposible conectarse al servicio de Discord. Es equivalente a un usuario y un password a la vez, no debe subirse a ningún repositorio y se le debe dar el mismo tratamiento que se le da a una contraseña de cualquier otro servicio ([ver Creación del bot](#creación-del-bot-en-discord)). 
* `DB_BACKUP_INTERVAL_IN_MINUTES`: cada cuanto se persiste en git el archivo con la base de datos. Esto genera un commit en el archivo, haya o no cambios.
* `DB_REPOSITORY`: nombre del repositorio donde se encuentran los archivos de la base de datos ([ver Persitencia](#persistencia-de-la-base-de-datos)). Ejemplo, si la URL del repositorio es `http://github.com/my-bot/db-files`, el nombre del repositorio es `my-bot/db-files`. 
* `GITHUB_TOKEN`: token generado para algun usuario que tenga acceso al repositorio donde se persiste la base de datos ([ver Persitencia](#persistencia-de-la-base-de-datos)). Esto es equivalente a una contraseña, no se debe compartir con absolutamente nadie.
* `ENV`: los posibles valores son `dev`, `stage`, `prod`. Sirve para poder utilizar diferentes archivos de bases de datos durante las pruebas. Por ejemplo, localmente podría ser `dev`, en una sala de pruebas, con usuarios de pruebas, `stage`, y finalmente la base de datos donde hay usuarios reales `prod` ([ver Persitencia](#persistencia-de-la-base-de-datos)).
* `UPDATES_CHANNEL`: es el nombre del canal donde Levin publicará las subidas/bajadas de nivel. Es el nombre tal cual esté escrito en Discord ([ver Canal de Leveleos](#canal-donde-publicar-los-leveleos))

## Deployment
Cualquier servidor que pueda ejecutar aplicaciones NodeJS puede correr perfectamente Levin. Con el mismo comando que se utiliza localmente, ya que la app no requiere ningun paso de building.

Este repositorio en particular ofrece soporte para deployar en Heroku. Para utilizar Heroku solo es necesario crear una nueva aplicacion y configurar las variables de entorno que [necesita Levin](#flags-de-configuración) en las Settings de la app Heroku. El typo de CPU `free dyno` es suficiente.

## Recursos
* Lista de eventos disponibles: https://gist.github.com/koad/316b265a91d933fd1b62dddfcc3ff584
* Idem: https://github.com/onepiecehung/discordjs-logger
* Documentación general de DiscordJS (API usada en la comunicación con Discord): https://discordjs.guide/#before-you-begin
* DiscordJS API: https://discord.js.org/#/docs/main/stable/general/welcome
* Octokit (GitHub API): https://octokit.github.io/rest.js/v17
* Guía General de TypeScript: https://www.typescriptlang.org/docs/home.html
* Referencia de comandos CLI de Heroku: https://devcenter.heroku.com/articles/heroku-cli-commands
* Dyno Management en Heroku: https://devcenter.heroku.com/articles/dynos#cli-commands-for-dyno-management

