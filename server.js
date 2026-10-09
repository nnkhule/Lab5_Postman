
const http = require("http");

const students = {};
const courses = {};
const registrations = [];

function send(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error("BAD_JSON"));
            }
        });

        req.on("error", reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost:3000");
    const parts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    try {
        // PUT /students/:id
        if (method === "PUT" &&
            parts[0] === "students" &&
            parts.length === 2) {

            const id = parts[1];

            if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
                return send(res, 400, {
                    result: "ERROR_BAD_REQUEST"
                });
            }

            const body = await readBody(req);

            students[id] = {
                status: body.status ?? "active",
                coursesTaken: body.coursesTaken ?? []
            };

            return send(res, 200, { result: "OK" });
        }

        // PUT /courses/:id
        if (method === "PUT" &&
            parts[0] === "courses" &&
            parts.length === 2) {

            const id = parts[1];

            if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
                return send(res, 400, {
                    result: "ERROR_BAD_REQUEST"
                });
            }

            const body = await readBody(req);

            courses[id] = {
                courseID: id,
                prerequisites: body.prerequisites ?? []
            };

            return send(res, 200, { result: "OK" });
        }

        // GET /courses/:id
        if (method === "GET" &&
            parts[0] === "courses" &&
            parts.length === 2) {

            const course = courses[parts[1]];

            if (!course) {
                return send(res, 404, {
                    result: "ERROR_NO_COURSE"
                });
            }

            return send(res, 200, course);
        }

        // POST /registrations
        if (method === "POST" &&
            url.pathname === "/registrations") {

            let body;

            try {
                body = await readBody(req);
            } catch {
                return send(res, 400, {
                    result: "ERROR_BAD_JSON"
                });
            }

            const { studentID, courseID } = body;

            if (!studentID || !courseID) {
                return send(res, 400, {
                    result: "ERROR_BAD_REQUEST"
                });
            }

            const student = students[studentID];

            if (!student) {
                return send(res, 200, {
                    result: "ERROR_NO_STUDENT"
                });
            }

            if (student.status !== "active") {
                return send(res, 200, {
                    result: "ERROR_INACTIVE_STUDENT"
                });
            }

            const course = courses[courseID];

            if (!course) {
                return send(res, 200, {
                    result: "ERROR_NO_COURSE"
                });
            }

            const missing = course.prerequisites.filter(
                prerequisite =>
                    !student.coursesTaken.includes(prerequisite)
            );

            if (missing.length > 0) {
                return send(res, 200, {
                    result: "ERROR_PREREQUISITES",
                    missing
                });
            }

            const registration = {
                registrationID: registrations.length + 1,
                studentID,
                courseID
            };

            registrations.push(registration);

            return send(res, 201, {
                result: "OK",
                registrationID: registration.registrationID
            });
        }

        // GET /registrations
        if (method === "GET" &&
            url.pathname === "/registrations") {
            return send(res, 200, registrations);
        }

        return send(res, 404, {
            result: "ERROR_NOT_FOUND"
        });

    } catch {
        return send(res, 400, {
            result: "ERROR_BAD_REQUEST"
        });
    }
});

server.listen(3000, () => {
    console.log("Бүртгэлийн API: http://localhost:3000");
});
