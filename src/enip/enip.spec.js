const { ENIP } = require("./index");

describe("ENIP Class", () => {
    describe("Properties Accessors", () => {
        it("error", () => {
            const enip = new ENIP();
            const error = { code: 0x41, msg: "this failed for some reason" };
            enip.state.error = error;

            expect(enip.error).toMatchObject(error);
        });

        it("establising", () => {
            const enip = new ENIP();

            expect(enip.establishing).toBe(false);
        });

        it("established", () => {
            const enip = new ENIP();

            expect(enip.established).toBe(false);
        });

        it("session_id", () => {
            const enip = new ENIP();
            expect(enip.session_id).toBe(null);

            enip.state.session.id = 23455;
            expect(enip.session_id).toBe(23455);
        });
        
        it("establishing_conn", () => {
            const enip = new ENIP();
            expect(enip.establishing_conn).toBe(false);

            enip.state.connection.establishing = true;
            expect(enip.establishing_conn).toBe(true);

            enip.establishing_conn = false;
            expect(enip.state.connection.establishing).toBe(false);

            expect(() => {
                enip.establishing_conn = "establishing";
            }).toThrow();
        });

        
        it("established_conn", () => {
            const enip = new ENIP();
            expect(enip.established_conn).toBe(false);

            enip.state.connection.established = true;
            expect(enip.established_conn).toBe(true);

            enip.established_conn = false;
            expect(enip.state.connection.established).toBe(false);

            expect(() => {
                enip.established_conn = "established";
            }).toThrow();
        });
        
        it("id_conn", () => {
            const enip = new ENIP();
            expect(enip.id_conn).toBe(null);

            enip.state.connection.id = 0x1337;
            expect(enip.id_conn).toBe(0x1337);

            enip.id_conn = 0x00;
            expect(enip.state.connection.id).toBe(0x00);

            expect(() => {
                enip.id_conn = "myTestID";
            }).toThrow();
        });

        it("seq_conn", () => {
            const enip = new ENIP();
            expect(enip.seq_conn).toBe(0x00);

            enip.state.connection.seq_num = 0x01;
            expect(enip.seq_conn).toBe(0x01);

            enip.seq_conn = 0x02;
            expect(enip.state.connection.seq_num).toBe(0x02);

            expect(() => {
                enip.seq_conn = "mySeqNo";
            }).toThrow();
        });
    });
});
